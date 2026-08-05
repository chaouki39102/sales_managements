<?php

namespace App\Services\Portal;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\PortalOrder;
use App\Models\PortalOrderStatusHistory;
use App\Models\DocumentType;
use App\Models\Setting;
use App\Models\Warehouse;
use App\Services\CommercialDocumentService;
use App\Services\CompanyContextService;
use App\Services\DocumentConversionService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * PortalOrderService — منطق طلبات بوابة الزبائن (معزول تماماً).
 *
 * القاعدة المعمارية: لا نضيف أي شرط "portal/طلب" داخل CommercialDocumentService.
 * كل منطق الطلب هنا — الإنشاء، التعديل، الحالة، والتحويل إلى فاتورة —
 * منفذ فوق خدمات المستندات الموجودة كما هي.
 *
 * الطلب = غلاف (reference + حالة دورة الطلب + لقطات الإجماليات) حول مستند
 * تجاري من نوع CMD (أمر زبون). العمليات المالية (الطابع الجبائي، حركات
 * المخزون، قيود الرصيد) لا تعمل على الطلب إطلاقاً — تُفعَّل فقط عند التحويل
 * إلى فاتورة (affects_accounting = true).
 */
class PortalOrderService
{
    public function __construct(
        private CommercialDocumentService $documents,
        private DocumentConversionService $converter,
        private CompanyContextService     $companyContext,
    ) {}

    // ═══════════════════════════════════════════════════════════════════
    // إنشاء طلب (زبون البوابة)
    // ═══════════════════════════════════════════════════════════════════

    public function create(array $data, ?int $partyId = null): PortalOrder
    {
        $companyId = $this->companyContext->get();
        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        $partyId = $partyId ?: (int) ($data['party_id'] ?? 0);
        if (!$partyId) {
            throw new BusinessRuleException('لا يمكن إنشاء الطلب دون تعامل (زبون).', 422);
        }

        $type = $this->cmdType($companyId);

        $lines = $this->resolveLines($data['lines'] ?? []);
        if (empty($lines)) {
            throw new BusinessRuleException('الطلب فارغ — أضف منتجاً واحداً على الأقل.', 422);
        }

        $doc = $this->documents->create([
            'document_type_id' => $type->id,
            'party_id'         => $partyId,
            'warehouse_id'     => $this->resolveWarehouseId($companyId),
            'fiscal_year_id'   => $this->currentFiscalYearId($companyId),
            'document_date'    => $data['document_date'] ?? now()->toDateString(),
            'due_date'         => $data['due_date'] ?? null,
            'notes'            => $data['notes'] ?? null,
            'internal_notes'   => 'طلب بوابة زبائن',
            'user_id'          => $this->resolveSystemUserId($companyId),
            'lines'            => $lines,
        ]);

        $order = DB::transaction(function () use ($doc, $partyId, $companyId, $data) {
            $order = PortalOrder::create([
                'company_id'             => $companyId,
                'party_id'               => $partyId,
                'commercial_document_id' => $doc->id,
                'reference'              => $doc->document_number,
                'status'                 => PortalOrder::STATUS_PREPARING,
                'notes'                  => $data['notes'] ?? null,
                'total_ht'               => $doc->total_ht,
                'total_tva'              => $doc->total_tva,
                'total_ttc'              => $doc->total_ttc,
                'requested_at'           => now(),
            ]);

            $this->recordHistory($order, PortalOrder::STATUS_PREPARING, PortalOrder::CHANGED_BY_CUSTOMER);

            return $order;
        });

        return $order->load('document.lines.product', 'party');
    }

    // ═══════════════════════════════════════════════════════════════════
    // تعديل طلب (فقط ما دام قيد الانتظار — يسري على المستند المرتبط)
    // ═══════════════════════════════════════════════════════════════════

    public function update(PortalOrder $order, array $data): PortalOrder
    {
        $this->assertEditable($order);

        $doc = $order->document ?? throw new ModelNotFoundException('المستند المرتبط بالطلب غير موجود');

        $lines = isset($data['lines']) ? $this->resolveLines($data['lines']) : null;
        if (is_array($lines) && empty($lines)) {
            throw new BusinessRuleException('الطلب لا يمكن أن يكون فارغاً.', 422);
        }

        $payload = [
            'notes'         => $data['notes'] ?? $doc->notes,
            'document_date' => $data['document_date'] ?? $doc->document_date?->format('Y-m-d'),
            'due_date'      => $data['due_date'] ?? $doc->due_date?->format('Y-m-d'),
        ];
        if (is_array($lines)) {
            $payload['lines'] = $lines;
        }

        $this->documents->update($doc, $payload);

        $order->forceFill([
            'notes'      => $data['notes'] ?? $order->notes,
            'total_ht'   => $doc->fresh()->total_ht,
            'total_tva'  => $doc->fresh()->total_tva,
            'total_ttc'  => $doc->fresh()->total_ttc,
        ])->save();

        return $order->load('document.lines.product', 'party');
    }

    // ═══════════════════════════════════════════════════════════════════
    // تحرير أسطر الطلب من قبل المسؤول (إضافة/حذف/تعديل كميات)
    //
    // عقد الاستبدال الكامل: الواجهة الإدارية ترسل مجموعة الأسطر المطلوبة —
    //   { line_id, quantity }            تعديل كمية سطر موجود (أو حذفه إذا quantity=0)
    //   { product_id, quantity, packaging_id? }  سطر جديد (تسعير خادم صرف)
    // ثم يُعاد بناء المستند عبر تحديث الإجماليات القياسي. التحقق من المخزون
    // غير حاجز هنا — التحويل نفسه (createStockMovements) هو البوابة الحاسمة.
    // ═══════════════════════════════════════════════════════════════════

    public function adminReplaceLines(PortalOrder $order, array $payloadLines): PortalOrder
    {
        // مرحلة التحليل: يبقى التحرير متاحاً في «قيد الاعداد»/«مؤكد»/«تم المعالجة»
        // فقط. بمجرد «الشحن» يغلق التحرير — بعدها لا يعدل إلا بالتحويل/الإرجاع.
        if (in_array($order->status, [
            PortalOrder::STATUS_SHIPPED,
            PortalOrder::STATUS_DELIVERED,
            PortalOrder::STATUS_RETURNED,
            PortalOrder::STATUS_CANCELLED,
        ], true)) {
            throw new BusinessRuleException('لا يمكن تعديل أسطر طلب تم شحنه أو تسليمه أو إرجاعه أو إلغاؤه.', 409);
        }

        $doc = $order->document ?? throw new ModelNotFoundException('المستند المرتبط بالطلب غير موجود');
        $doc->loadMissing(['lines.product']);

        $existing    = $doc->lines->keyBy('id');
        $rebuilt     = [];
        $newEntries  = [];

        foreach ($payloadLines as $i => $entry) {
            $lineId = (int) ($entry['line_id'] ?? 0);
            $qty    = (float) ($entry['quantity'] ?? 0);

            if ($qty < 0) {
                throw new BusinessRuleException('الكمية في السطر ' . ($i + 1) . ' يجب أن تكون موجبة أو صفراً.', 422);
            }

            if ($lineId) {
                $line = $existing->get($lineId);
                if (!$line) {
                    throw new BusinessRuleException('السطر ذو المعرف ' . $lineId . ' غير موجود في الطلب.', 422);
                }
                if ($qty == 0) {
                    continue; // حذف السطر
                }

                // إعادة بناء عقد الوحدة Phase 51 للسطر القائم: unit_price_ht = سعر
                // الوحدة + pack_qty = عامل التعبئة المجمّد. الخادم يضرب في pack_qty.
                $packQty = (float) ($line->packaging_units_snapshot ?? 1);
                if ($packQty <= 0) {
                    $packQty = 1;
                }
                $perUnit = (float) $line->unit_price_ht / $packQty;

                $rebuiltEntry = [
                    'product_id'    => (int) $line->product_id,
                    'quantity'      => $qty,
                    'unit_price_ht' => round($perUnit, 4),
                    'tva_rate'      => (float) $line->tva_rate,
                    'description'   => $line->description ?? $line->product?->name,
                ];
                if ($line->packaging_id) {
                    $rebuiltEntry['packaging_id'] = (int) $line->packaging_id;
                    $rebuiltEntry['pack_qty']     = $packQty;
                }
                $rebuilt[] = $rebuiltEntry;
            } else {
                // سطر جديد — تسعير الخادم فقط (product_id + quantity + packaging_id)
                $newEntries[] = $entry;
            }
        }

        $targetLines = array_merge($rebuilt, $this->resolveLines($newEntries));

        if (empty($targetLines)) {
            throw new BusinessRuleException('الطلب لا يمكن أن يبقى فارغاً — أضف منتجاً واحداً على الأقل.', 422);
        }

        // update() يعيد بناء الأسطر ويحدّث الإجماليات (CMD لا يحرّك مخزوناً
        // لأن affects_stock_direction = 0 — لا آثار مالية عند التحرير).
        $this->documents->update($doc, ['lines' => $targetLines]);

        $doc->refresh();
        $order->forceFill([
            'total_ht'  => $doc->total_ht,
            'total_tva' => $doc->total_tva,
            'total_ttc' => $doc->total_ttc,
        ])->save();

        $this->recordHistory(
            $order,
            $order->status,
            PortalOrder::CHANGED_BY_ADMIN,
            auth()->user()?->name,
            'تعديل أسطر الطلب من قبل المسؤول'
        );

        return $this->loadDetail($order);
    }

    /**
     * تقرير توفر المخزون لكل سطر (أداة المسؤول قبل التحويل).
     * القيمة null تعني أن المنتج لا يدير مخزوناً.
     */
    public function stockAvailabilityForOrder(PortalOrder $order): array
    {
        $doc = $order->document;
        if (!$doc) {
            return [];
        }

        $warehouseId = (int) ($doc->warehouse_id ?? 0);
        $rows        = app(\App\Services\InventoryStockService::class)
            ->getStockAt(now()->toDateString(), $warehouseId ?: null);
        $stockById   = collect($rows)->keyBy('id');

        return ($doc->lines ?? collect())->map(function ($l) use ($stockById) {
            $available = $stockById->get((int) $l->product_id);
            $stockQty  = $available ? (float) $available['current_stock'] : null;
            $manages   = (bool) ($l->product?->manages_stock ?? $available['manages_stock'] ?? false);
            $baseQty   = ($l->packaging_id && $l->packaging_units_snapshot)
                ? round((float) $l->quantity * (float) $l->packaging_units_snapshot, 4)
                : (float) $l->quantity;

            return [
                'line_id'    => $l->id,
                'product_id' => (int) $l->product_id,
                'available'  => $manages ? $stockQty : null,
                'required'   => $baseQty,
                'sufficient' => $manages ? $baseQty <= $stockQty : null,
            ];
        })->values()->all();
    }

    // ═══════════════════════════════════════════════════════════════════
    // قائمة الطلبات (زبون معيّن أو الكل، مع فلتر حالة)
    // ═══════════════════════════════════════════════════════════════════

    public function paginate(?int $partyId = null, string $status = '', int $perPage = 15): LengthAwarePaginator
    {
        $companyId = $this->companyContext->get();

        $query = PortalOrder::query()
            ->with(['party:id,name,code,phone', 'document:id,document_number,document_date,net_to_pay,document_type_id'])
            ->where('company_id', $companyId);

        if ($partyId) {
            $query->where('party_id', $partyId);
        }

        if ($status !== '' && in_array($status, PortalOrder::STATUSES, true)) {
            $query->where('status', $status);
        }

        $search = trim((string) request()->input('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('party', fn($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $query->orderByDesc('id');

        return $query->paginate(min(max($perPage, 1), 100));
    }

    // ═══════════════════════════════════════════════════════════════════
    // ملخص الطلبات حسب الحالة (خط أنابيب لوحة الإدارة)
    // ═══════════════════════════════════════════════════════════════════

    public function summary(): array
    {
        $companyId = $this->companyContext->get();

        $counts = PortalOrder::query()
            ->where('company_id', $companyId)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $result = ['total' => 0];
        foreach (PortalOrder::STATUSES as $status) {
            $result[$status]   = (int) ($counts[$status] ?? 0);
            $result['total']  += $result[$status];
        }

        return $result;
    }

    // ═══════════════════════════════════════════════════════════════════
    // تفاصيل طلب (مع الأسطر + الحالات)
    // ═══════════════════════════════════════════════════════════════════

    public function loadDetail(PortalOrder $order): PortalOrder
    {
        return $order->load([
            'party:id,name,code,phone,nif',
            'document.lines.product',
            'histories',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // تغيير الحالة (يُسجَّل في سجلّ الحالات)
    // ═══════════════════════════════════════════════════════════════════

    public function changeStatus(
        PortalOrder $order,
        string $status,
        string $changedBy,
        ?string $changedByName = null,
        ?string $note = null,
    ): PortalOrder {
        if (!in_array($status, PortalOrder::STATUSES, true)) {
            throw new BusinessRuleException('حالة الطلب غير صالحة.', 422);
        }

        $current = $order->status;

        // قواعد الانتقال لدورة طلب السلعة (الطريقة الاحترافية):
        //  - لا خروج من الحالات النهائية: مرتجع / ملغى.
        //  - من «تم التسليم» لا يُقبل إلا الانتقال إلى «مرتجع» (إرجاع بعد التسليم).
        //  - الزبون يستطيع تأكيد طلبه (preparing → confirmed) أو إلغاءه،
        //    وما دام الطلب «قيد الاعداد» فقط. بعد التأكيد لا يعود للزبون أي تصرف.
        if ($status === $current) {
            return $order;
        }

        if (in_array($current, PortalOrder::TERMINAL_STATUSES, true)) {
            throw new BusinessRuleException('لا يمكن تغيير حالة طلب مرتجع أو ملغى.', 409);
        }
        if ($current === PortalOrder::STATUS_DELIVERED && $status !== PortalOrder::STATUS_RETURNED) {
            throw new BusinessRuleException('لا يمكن تغيير حالة طلب تم تسليمه إلا إلى «مرتجع».', 409);
        }
        if ($changedBy === PortalOrder::CHANGED_BY_CUSTOMER) {
            $isCustomerConfirm = $status === PortalOrder::STATUS_CONFIRMED
                && $current === PortalOrder::STATUS_PREPARING;
            $isCustomerCancel  = $status === PortalOrder::STATUS_CANCELLED
                && $current === PortalOrder::STATUS_PREPARING;

            if (!$isCustomerConfirm && !$isCustomerCancel) {
                throw new BusinessRuleException('الزبون يستطيع تأكيد الطلب أو إلغاءه فقط، وما دام قيد الاعداد.', 422);
            }
        }

        DB::transaction(function () use ($order, $status, $changedBy, $changedByName, $note) {
            $order->forceFill(['status' => $status])->save();
            $this->recordHistory($order, $status, $changedBy, $changedByName, $note);
        });

        return $order->load('histories');
    }

    // ═══════════════════════════════════════════════════════════════════
    // تحويل الطلب إلى فاتورة (FV/POS) — هنا فقط تُفعَّل العمليات المالية
    // (المخزون، الطابع الجبائي، قيود الرصيد) عبر آلية التحويل القياسية.
    // ═══════════════════════════════════════════════════════════════════

    public function convertToSale(PortalOrder $order, string $targetCode = 'FV'): CommercialDocument
    {
        // الطريقة الاحترافية: لا تحويل إلا بعد تأكيد الطلب (preparing → confirmed)
        // ومروره بمرحلة التحليل (تم المعالجة / الشحن). «قيد الاعداد» يعني أن
        // الزبون لم يثبّت الطلب بعد — لا يجوز فوترته قبل موافقته.
        if ($order->status === PortalOrder::STATUS_PREPARING) {
            throw new BusinessRuleException('يجب تأكيد الطلب أولاً (من الزبون أو من المسؤول) قبل تحويله إلى فاتورة.', 409);
        }
        if (in_array($order->status, [
            PortalOrder::STATUS_DELIVERED,
            PortalOrder::STATUS_RETURNED,
            PortalOrder::STATUS_CANCELLED,
        ], true)) {
            throw new BusinessRuleException('لا يمكن تحويل طلب تم تسليمه أو إرجاعه أو إلغاؤه إلى فاتورة.', 409);
        }

        $doc = $order->document ?? throw new ModelNotFoundException('المستند المرتبط بالطلب غير موجود');

        $allowed = $this->converter->getAllowedTargets('CMD');
        if (!in_array($targetCode, $allowed, true)) {
            throw new BusinessRuleException(
                "التحويل إلى {$targetCode} غير مسموح من أمر زبون. المسموح: " . implode(', ', $allowed),
                422
            );
        }

        $sale = $this->converter->convert($doc, $targetCode);

        $this->changeStatus(
            $order,
            PortalOrder::STATUS_DELIVERED,
            PortalOrder::CHANGED_BY_ADMIN,
            auth()->user()?->name,
            "تم تحويل الطلب إلى فاتورة {$sale->document_number}"
        );

        return $sale;
    }

    // ═══════════════════════════════════════════════════════════════════
    // تمثيل JSON (توحيد شكل الرد)
    // ═══════════════════════════════════════════════════════════════════

    public function toArray(PortalOrder $order): array
    {
        $order->loadMissing(['party', 'document.documentType', 'document.lines.product', 'histories']);

        $doc = $order->document;

        return [
            'id'               => $order->id,
            'reference'        => $order->reference,
            'status'           => $order->status,
            'status_label'     => $order->status_label,
            'notes'            => $order->notes,
            'total_ht'         => (float) $order->total_ht,
            'total_tva'        => (float) $order->total_tva,
            'total_ttc'        => (float) $order->total_ttc,
            'items_count'      => $doc?->lines?->count() ?? 0,
            'requested_at'     => $order->requested_at?->toISOString(),
            'created_at'       => $order->created_at?->toISOString(),
            'updated_at'       => $order->updated_at?->toISOString(),
            'party'            => $order->party ? [
                'id'    => $order->party->id,
                'name'  => $order->party->name,
                'code'  => $order->party->code,
                'phone' => $order->party->phone,
            ] : null,
            'document' => $doc ? [
                'id'              => $doc->id,
                'document_number' => $doc->document_number,
                'document_date'   => $doc->document_date?->format('Y-m-d'),
                'document_type'   => $doc->documentType?->code,
                'type_name'       => $doc->documentType?->name,
                'net_to_pay'      => (float) $doc->net_to_pay,
                'warehouse_id'    => $doc->warehouse_id,
            ] : null,
            'lines' => ($doc?->lines ?? collect())->map(fn($l) => [
                'line_id'          => $l->id,
                'product_id'       => $l->product_id,
                'product_name'     => $l->product?->name ?? $l->description,
                'product_ref'      => $l->product?->ref ?? null,
                'unit'             => $l->product?->unit?->abbreviation,
                'unit_name'        => $l->product?->unit?->abbreviation,
                'quantity'         => (float) $l->quantity,
                'unit_price_ht'    => (float) $l->unit_price_ht,
                'packaging_id'     => $l->packaging_id,
                'pack_qty'         => (float) ($l->packaging_units_snapshot ?? 1),
                'tva_rate'         => (float) $l->tva_rate,
                'total_ht'         => (float) $l->total_ht,
                'total_tva'        => (float) $l->total_tva,
                'total_ttc'        => (float) $l->total_ttc,
            ])->values()->all(),
            'histories' => ($order->histories ?? collect())->map(fn($h) => [
                'id'          => $h->id,
                'status'      => $h->status,
                'status_label'=> $h->status_label,
                'changed_by'  => $h->changed_by,
                'changed_by_name' => $h->changed_by_name,
                'note'        => $h->note,
                'created_at'  => $h->created_at?->toISOString(),
            ])->values()->all(),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // أدوات داخلية
    // ═══════════════════════════════════════════════════════════════════

    private function cmdType(int $companyId): DocumentType
    {
        $type = DocumentType::where('company_id', $companyId)->where('code', 'CMD')->first();

        if (!$type) {
            app(PortalOrderInstaller::class)->installForCompany($companyId);
            $type = DocumentType::where('company_id', $companyId)->where('code', 'CMD')->first();
        }

        if (!$type) {
            throw new BusinessRuleException('نوع مستند "أمر زبون" (CMD) غير مهيّأ لهذه المؤسسة.', 422);
        }

        return $type;
    }

    private function currentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    private function resolveWarehouseId(int $companyId): int
    {
        // أمر الزبون لا يحرّك مخزوناً، لكن commercial_documents.warehouse_id
        // عمود إجباري — نُحضر المخزن الافتراضي أو أول مخزن نشط للمؤسسة.
        $fromSetting = Setting::getSetting('default_warehouse_id', null, $companyId);
        if ($fromSetting) {
            return (int) $fromSetting;
        }

        $firstId = Warehouse::where('company_id', $companyId)
            ->where('active', true)
            ->value('id');

        if ($firstId) {
            return (int) $firstId;
        }

        throw new BusinessRuleException('لا يوجد مخزن افتراضي — حدد مخزناً في إعدادات المؤسسة.', 422);
    }

    private function resolveSystemUserId(int $companyId): int
    {
        // بوابة الزبائن تُصادِق PortalUser (ليس User) — والمستند التجاري يتطلب
        // user_id صحيحاً من جدول users. نستخدم مالك المؤسسة كمستخدم النظام،
        // أو أول مستخدم نشط في المؤسسة إن لم يوجد مالك.
        $company = Company::find($companyId);

        if ($company?->owner_id) {
            return (int) $company->owner_id;
        }

        $firstUserId = DB::table('company_user')
            ->where('company_id', $companyId)
            ->where('active', true)
            ->value('user_id');

        if ($firstUserId) {
            return (int) $firstUserId;
        }

        $anyUserId = DB::table('users')->value('id');

        return $anyUserId ? (int) $anyUserId : throw new BusinessRuleException('لا يوجد مستخدم نظام لتوثيق الطلب.', 422);
    }

    private function assertEditable(PortalOrder $order): void
    {
        if ($order->status !== PortalOrder::STATUS_PREPARING) {
            throw new BusinessRuleException('لا يمكن تعديل الطلب إلا وهو قيد الاعداد.', 409);
        }
    }

    /**
     * تسعير الخادم — لا يُقبل أي سعر من الزبون إطلاقاً.
     *
     * الزبون يرسل product_id + quantity + packaging_id فقط. هنا نُحضر السعر من
     * جدول المنتجات (default_selling_price_ht = سعر الوحدة) ونبعث إلى
     * createDocumentLines عقد الوحدة Phase 51:
     *   unit_price_ht = السعر الأساسي للوحدة + pack_qty = عامل التعبئة.
     * الخادم (CommercialDocumentService) هو من يضرب في pack_qty.
     */
    private function resolveLines(array $items): array
    {
        $productIds = array_unique(array_map(fn($e) => (int) ($e['product_id'] ?? 0), $items));
        $products   = \App\Models\Product::query()
            // prices ضرورية: default_selling_price_ht يعتمد على سعر قائمة المستوى
            // الافتراضي (محمّل مسبقاً)، وبدونها يقع في fallback purchase×1.3.
            ->with(['tva', 'unit', 'prices', 'packagings'])
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $lines = [];

        foreach ($items as $i => $entry) {
            $product = $products->get((int) ($entry['product_id'] ?? 0));
            if (!$product) {
                throw new BusinessRuleException(
                    'المنتج المطلوب في السطر ' . ($i + 1) . ' غير متوفر في كتالوج المؤسسة.',
                    422
                );
            }
            if (!$product->active) {
                throw new BusinessRuleException(
                    "المنتج «{$product->name}» غير نشط ولا يمكن طلبه.",
                    422
                );
            }

            $quantity = (float) ($entry['quantity'] ?? 0);
            if ($quantity <= 0) {
                throw new BusinessRuleException('الكمية في السطر ' . ($i + 1) . ' يجب أن تكون موجبة.', 422);
            }

            $packaging = null;
            if (!empty($entry['packaging_id'])) {
                $packaging = $product->packagings->firstWhere('id', (int) $entry['packaging_id']);
                if (!$packaging || !$packaging->active) {
                    throw new BusinessRuleException(
                        'التعبئة المختارة في السطر ' . ($i + 1) . ' غير متوفرة لهذا المنتج.',
                        422
                    );
                }
            } else {
                // لا تعبئة صريحة → التعبئة الافتراضية إن وجدت (سلوك البوابة القائم)
                $packaging = $product->defaultPackaging();
                if ($packaging && !$packaging->active) {
                    $packaging = null;
                }
            }

            $line = [
                'product_id'     => $product->id,
                'quantity'       => $quantity,
                'unit_price_ht'  => (float) $product->default_selling_price_ht,
                'tva_rate'       => (float) ($product->tva?->rate ?? 0),
                'description'    => $product->name,
            ];

            if ($packaging) {
                $line['packaging_id'] = $packaging->id;
                $line['pack_qty']     = (float) $packaging->quantity;
            }

            $lines[] = $line;
        }

        return $lines;
    }

    private function recordHistory(
        PortalOrder $order,
        string $status,
        string $changedBy,
        ?string $changedByName = null,
        ?string $note = null,
    ): void {
        PortalOrderStatusHistory::create([
            'portal_order_id'  => $order->id,
            'status'           => $status,
            'changed_by'       => $changedBy,
            'changed_by_name'  => $changedByName,
            'note'             => $note,
        ]);
    }
}
