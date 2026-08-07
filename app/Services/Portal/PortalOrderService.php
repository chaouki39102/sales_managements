<?php

namespace App\Services\Portal;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\PortalOrder;
use App\Models\PortalOrderStatusHistory;
use App\Models\DocumentType;
use App\Models\Party;
use App\Models\Setting;
use App\Models\Warehouse;
use App\Services\CommercialDocumentService;
use App\Services\CompanyContextService;
use App\Services\DocumentConversionService;
use App\Services\PaymentSynchronizer;
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
    // ═══════════════════════════════════════════════════════════════════
    // مصفوفة الانتقالات الصارمة — خطوة واحدة إلى الأمام في كل مرة.
    //
    // القاعدة: لا قفز للأمام أبداً (مثل قيد الاعداد → تم المعالجة) ولا رجوع
    // إلى الوراء (مثل تم التسليم → مؤكد). كل حالة لها مجموعة الانتقالات
    // التالية الوحيدة المسموحة، والخادم يرفض أي شيء خارجها بخطأ 409.
    // التحويل إلى فاتورة هو الاستثناء الوحيد: من مؤكد/تم المعالجة/الشحن
    // يقفز مباشرة إلى «تم التسليم»، ومن «تم التسليم» نفسه يُسمح به (يبقى
    // الوضع كما هو) — يُنفَّذ داخل convertToSale، خارج المصفوفة.
    // ═══════════════════════════════════════════════════════════════════
    public const ALLOWED_ADMIN_TRANSITIONS = [
        PortalOrder::STATUS_PREPARING => [PortalOrder::STATUS_CONFIRMED, PortalOrder::STATUS_CANCELLED],
        PortalOrder::LEGACY_PENDING   => [PortalOrder::STATUS_CONFIRMED, PortalOrder::STATUS_CANCELLED],
        PortalOrder::STATUS_CONFIRMED => [PortalOrder::STATUS_PROCESSED],
        PortalOrder::STATUS_PROCESSED => [PortalOrder::STATUS_SHIPPED],
        PortalOrder::STATUS_SHIPPED   => [PortalOrder::STATUS_DELIVERED],
        PortalOrder::STATUS_DELIVERED => [PortalOrder::STATUS_RETURNED],
        PortalOrder::STATUS_RETURNED  => [],
        PortalOrder::STATUS_CANCELLED => [],
    ];

    /** الزبون: تأكيد أو إلغاء فقط، وما دام «قيد الاعداد». */
    public const ALLOWED_CUSTOMER_TRANSITIONS = [
        PortalOrder::STATUS_PREPARING => [PortalOrder::STATUS_CONFIRMED, PortalOrder::STATUS_CANCELLED],
        PortalOrder::LEGACY_PENDING   => [PortalOrder::STATUS_CONFIRMED, PortalOrder::STATUS_CANCELLED],
        PortalOrder::STATUS_CONFIRMED => [],
        PortalOrder::STATUS_PROCESSED => [],
        PortalOrder::STATUS_SHIPPED   => [],
        PortalOrder::STATUS_DELIVERED => [],
        PortalOrder::STATUS_RETURNED  => [],
        PortalOrder::STATUS_CANCELLED => [],
    ];

    public function __construct(
        private CommercialDocumentService $documents,
        private DocumentConversionService $converter,
        private CompanyContextService     $companyContext,
        private PaymentSynchronizer       $payments,
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

        // معاملة واحدة خارجية: أي throw بعد إنشاء المستند (مثل تجاوز الحد
        // الأدنى) يتراجع عن المستند بالكامل عبر savepoints المتداخلة.
        return DB::transaction(function () use ($type, $lines, $partyId, $companyId, $data) {
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

            // الحد الأدنى لمبلغ الطلب (إعداد portal_min_order_amount) —
            // يُطبق على الإجمالي الفعلي المحسوب من الخادم (total_ttc).
            $minAmount = (float) \App\Models\Setting::getSetting('portal_min_order_amount', 0, $companyId);
            if ($minAmount > 0 && (float) $doc->total_ttc < $minAmount) {
                throw new BusinessRuleException(
                    'الحد الأدنى لقيمة الطلب هو ' . number_format($minAmount, 2, '.', '')
                    . ' دج — قيمة طلبك الحالية ' . number_format((float) $doc->total_ttc, 2, '.', '') . ' دج.',
                    422
                );
            }

            // الحد الأقصى لمبلغ الطلب (إعداد portal_max_order_amount) — يُطبق
            // بنفس المعاملة: أي تجاوز يُرفض الطلب ويتراجع المستند.
            $maxAmount = (float) \App\Models\Setting::getSetting('portal_max_order_amount', 0, $companyId);
            if ($maxAmount > 0 && (float) $doc->total_ttc > $maxAmount) {
                throw new BusinessRuleException(
                    'الحد الأقصى لقيمة الطلب هو ' . number_format($maxAmount, 2, '.', '')
                    . ' دج — قيمة طلبك الحالية ' . number_format((float) $doc->total_ttc, 2, '.', '') . ' دج.',
                    422
                );
            }

            $order = PortalOrder::create([
                'company_id'             => $companyId,
                'party_id'               => $partyId,
                // حقول الزبون العام (الطلب العام بدون حساب): تُربط بحقول الطلب
                // نفسه — يبقى party_id على زبون الصندوق المشترك (Client Cash).
                'customer_name'          => $data['customer_name'] ?? null,
                'customer_phone'         => $data['customer_phone'] ?? null,
                'customer_address'       => $data['customer_address'] ?? null,
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
        })->load('document.lines.product', 'party');
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
            throw new BusinessRuleException('لا يمكن تعديل منتجات طلب تم شحنه أو تسليمه أو إرجاعه أو إلغاؤه.', 409);
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

                // عقد الوحدة Phase 51: unit_price_ht = سعر الوحدة و pack_qty =
                // عامل التعبئة المجمّد. الخادم يضرب في pack_qty — المسؤول يعدّل
                // سعر الوحدة (أو سعر التعبئة ÷ عامل التعبئة).
                $packQty = (float) ($line->packaging_units_snapshot ?? 1);
                if ($packQty <= 0) {
                    $packQty = 1;
                }

                $hasPrice    = array_key_exists('unit_price_ht', $entry) && $entry['unit_price_ht'] !== null;
                $hasDiscount = array_key_exists('discount_percentage', $entry) && $entry['discount_percentage'] !== null;

                // المسؤول يملك سعر التعديل الكامل: عند غياب unit_price_ht نحافظ
                // على سعر السطر المخزّن حرفياً. نسبة TVA تبقى كما خُزِّنت (قد
                // تكون 0 لزبون معفى جبائياً — لا نعيد اشتقاقها من المنتج الحيّ).
                // ملاحظة الدقة: لا نقرّب سعر الوحدة إلى 4 هنا عند غياب التعديل،
                // لأن createDocumentLines سيعيد الضرب في pack_qty بـ
                // round(perUnit × packQty, 4) = السعر المخزّن نفسه تماماً.
                // تقريب سعر الوحدة أولاً (round(storedPack/pack,4) × pack) قد
                // ينحرف عن القيمة المخزّنة للكميات غير القابلة للقسمة.
                $perUnit = $hasPrice
                    ? (float) $entry['unit_price_ht']
                    : (float) $line->unit_price_ht / $packQty;

                // خصم المبلغ الثابت (من طبقة كميات) يُحمَّل عند غياب تعديل
                // المسؤول حتى لا يُمحى بإعادة البناء على منتج لا يدير طبقات
                // (خصم% وخصم مبلغ ثابت حصريان — تعديل % يلغي الثابت).
                $storedFixedDisc = (float) ($line->discount_amount_per_unit ?? 0) > 0
                    ? (float) $line->discount_amount_per_unit
                    : null;

                $rebuiltEntry = [
                    'product_id'             => (int) $line->product_id,
                    'quantity'               => $qty,
                    'unit_price_ht'          => $hasPrice ? round($perUnit, 4) : $perUnit,
                    'tva_rate'               => (float) $line->tva_rate,
                    'discount_percentage'    => $hasDiscount
                        ? (float) $entry['discount_percentage']
                        : (float) ($line->discount_percentage ?? 0),
                    'discount_amount_per_unit' => $hasDiscount ? null : $storedFixedDisc,
                    'description'            => $line->description ?? $line->product?->name,
                ];
                if ($line->packaging_id) {
                    $rebuiltEntry['packaging_id'] = (int) $line->packaging_id;
                    $rebuiltEntry['pack_qty']     = $packQty;
                }
                $rebuilt[] = $rebuiltEntry;
            } else {
                // سطر جديد — تسعير الخادم فقط (product_id + quantity)، مع إمكانية
                // تعديل السعر/الخصم من المسؤول بعد التسعير.
                $newEntries[] = $entry;
            }
        }

        // تطبيق تعديلات السعر/الخصم المسموح بها على الأسطر الجديدة (بعد تسعير الخادم).
        $resolvedNew = $this->resolveLines($newEntries);
        foreach ($resolvedNew as $k => $rl) {
            $entry = $newEntries[$k] ?? [];
            if (array_key_exists('unit_price_ht', $entry) && $entry['unit_price_ht'] !== null) {
                $resolvedNew[$k]['unit_price_ht'] = round((float) $entry['unit_price_ht'], 4);
            }
            if (array_key_exists('discount_percentage', $entry) && $entry['discount_percentage'] !== null) {
                $resolvedNew[$k]['discount_percentage'] = (float) $entry['discount_percentage'];
            }
        }

        $targetLines = array_merge($rebuilt, $resolvedNew);

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
            'تعديل منتجات الطلب من قبل المسؤول'
        );

        return $this->loadDetail($order);
    }

    /**
     * تقرير توفر المخزون لكل سطر (أداة المسؤول قبل التحويل).
     *
     * النطاق كامل مثل أي مستند تجاري: المؤسسة (CompanyScope تلقائي عبر
     * InventoryStockService) + السنة المالية لمستند الطلب + مستودع الطلب.
     * تُحسب الأرقام عبر InventoryStockService::getStockAt — نفس مصدر
     * المخزون الذي تستخدمه صفحات المخزون والتقارير (رصيد افتتاحي + حركات
     * موثّقة حتى التاريخ، مستثنى المحذوف).
     *
     * available      = المخزون في مستودع الطلب نفسه
     * available_all  = المخزون الإجمالي في كل المستودعات (قرار النقل)
     * null تعني أن المنتج لا يدير مخزوناً.
     */
    public function stockAvailabilityForOrder(PortalOrder $order): array
    {
        $doc = $order->document;
        if (!$doc) {
            return [];
        }

        $fiscalYearId = (int) ($doc->fiscal_year_id ?? 0) ?: null;
        $warehouseId  = (int) ($doc->warehouse_id ?? 0) ?: null;
        $date         = now()->toDateString();
        $stock        = app(\App\Services\InventoryStockService::class);

        $inOrderWarehouse = $warehouseId
            ? collect($stock->getStockAt($date, $warehouseId, null, $fiscalYearId))->keyBy('id')
            : collect();
        $allWarehouses = collect($stock->getStockAt($date, null, null, $fiscalYearId))->keyBy('id');

        return ($doc->lines ?? collect())->map(function ($l) use ($inOrderWarehouse, $allWarehouses, $warehouseId) {
            $productId = (int) $l->product_id;
            $rowInWh   = $inOrderWarehouse->get($productId);
            $rowAll    = $allWarehouses->get($productId);
            $manages   = (bool) ($l->product?->manages_stock ?? $rowAll['manages_stock'] ?? false);
            $baseQty   = ($l->packaging_id && $l->packaging_units_snapshot)
                ? round((float) $l->quantity * (float) $l->packaging_units_snapshot, 4)
                : (float) $l->quantity;

            $available    = $manages ? (float) ($rowInWh['current_stock'] ?? 0) : null;
            $availableAll = $manages ? (float) ($rowAll['current_stock'] ?? 0) : null;

            return [
                'line_id'        => $l->id,
                'product_id'     => $productId,
                'warehouse_id'   => $warehouseId,
                'available'      => $available,
                'available_all'  => $availableAll,
                'required'       => $baseQty,
                'sufficient'     => $manages ? $baseQty <= $available : null,
                'sufficient_all' => $manages ? $baseQty <= $availableAll : null,
            ];
        })->values()->all();
    }

    // ═══════════════════════════════════════════════════════════════════
    // قائمة الطلبات (زبون معيّن أو الكل، مع فلتر حالة)
    // ═══════════════════════════════════════════════════════════════════

    public function paginate(?int $partyId = null, string $status = '', int $perPage = 15): LengthAwarePaginator
    {
        $companyId = $this->companyContext->get();

        // التحميل المسبق الكامل لما يحتاجه toArray — يمنع N+1 على كل صف
        // (party + documentType + lines + tva/unit + histories) ويمدّد
        // select الـ party بـ is_tva_exempt لشارة «معفى» في قوائم الإدارة.
        $query = PortalOrder::query()
            ->with([
                'party:id,name,code,phone,is_tva_exempt',
                'document.documentType',
                'document.lines.product.tva',
                'document.lines.product.unit',
                'histories',
            ])
            ->where('company_id', $companyId);

        if ($partyId) {
            $query->where('party_id', $partyId);
        }

        // legacy pending طلبات قديمة (قبل إدخال «قيد الاعداد») ما زالت ممكنة
        // في بيانات بعض المؤسسات — الفلتر يجب أن يقبلها مثل summary تماماً.
        if ($status !== '' && in_array($status, array_merge(PortalOrder::STATUSES, [PortalOrder::LEGACY_PENDING]), true)) {
            $query->where('status', $status);
        }

        // نطاق التاريخ (فلترة على تاريخ طلب المستند المرتبط — العمود الظاهر في الجدول).
        $fromDate = trim((string) request()->input('from_date', ''));
        $toDate   = trim((string) request()->input('to_date', ''));
        if ($fromDate !== '' || $toDate !== '') {
            $query->whereHas('document', function ($q) use ($fromDate, $toDate) {
                if ($fromDate !== '') {
                    $q->whereDate('document_date', '>=', $fromDate);
                }
                if ($toDate !== '') {
                    $q->whereDate('document_date', '<=', $toDate);
                }
            });
        }

        $search = trim((string) request()->input('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('party', fn($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        // ── الفرز من الخادم (sort_by/sort_dir) — أعمدة القائمة الأساسية.
        // عمودا «الزبون» (اسم الـ Party) و«المنتجات» (عدّاد أسطر المستند) ليسا
        // أعمدة مباشرة على portal_orders: يُفرز كل منهما بحقل فرعي (subquery)
        // بدل join حتى تبقى العلاقات المسبقة التحميل سليمة ولا يحدث تصادم أعمدة.
        $sortableColumns = ['reference', 'requested_at', 'status', 'total_ht', 'total_tva', 'total_ttc', 'created_at'];
        $sortBy  = trim((string) request()->input('sort_by', ''));
        $sortDir = strtolower(trim((string) request()->input('sort_dir', 'asc'))) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'party') {
            // الزبون الفعلي: اسم حساب البوابة (party.name) أو اسم الزائر
            // (customer_name) للطلبات العامة — فرز موحد بالتعرف COALESCE.
            $query->orderBy(
                DB::raw(
                    "COALESCE((SELECT p.name FROM parties p WHERE p.id = portal_orders.party_id), portal_orders.customer_name)"
                ),
                $sortDir,
            );
            $query->orderByDesc('id');
        } elseif ($sortBy === 'items_count') {
            $query->orderBy(
                DB::table('commercial_document_lines')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('commercial_document_lines.commercial_document_id', 'portal_orders.commercial_document_id'),
                $sortDir,
            );
            $query->orderByDesc('id');
        } elseif (in_array($sortBy, $sortableColumns, true)) {
            $query->orderBy($sortBy, $sortDir);
            // استقرار ترقيم الصفحات: تعادل القيم يُحسم بالمعرّف تنازلياً دائماً.
            $query->orderByDesc('id');
        } else {
            $query->orderByDesc('id');
        }

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

        // الطلبات القديمة العالقة بحالة pending (قبل إدخال «قيد الاعداد»)
        // تُعد ضمن الإجمالي ويُكشف عنها في لوحة الإدارة.
        $legacyPending = (int) ($counts[PortalOrder::LEGACY_PENDING] ?? 0);
        $result[PortalOrder::LEGACY_PENDING] = $legacyPending;
        $result['total'] += $legacyPending;

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

        if ($status === $current) {
            return $order;
        }

        // لا خروج من الحالات النهائية (مرتجع/ملغى).
        if (in_array($current, PortalOrder::TERMINAL_STATUSES, true)) {
            throw new BusinessRuleException('لا يمكن تغيير حالة طلب مرتجع أو ملغى.', 409);
        }

        $allowed = $this->allowedNextByStatus($current, $changedBy);

        if (!in_array($status, $allowed, true)) {
            if ($changedBy === PortalOrder::CHANGED_BY_CUSTOMER) {
                throw new BusinessRuleException(
                    'الزبون يستطيع تأكيد الطلب أو إلغاءه فقط، وما دام قيد الاعداد.',
                    422
                );
            }

            $labels = array_map(fn($s) => PortalOrder::statusLabelFor($s), $allowed);
            $message = 'لا يمكن الانتقال من «' . PortalOrder::statusLabelFor($current)
                . '» إلى «' . PortalOrder::statusLabelFor($status) . '» مباشرة —'
                . ' الطلب يسير خطوة واحدة في كل مرة.';
            if (!empty($labels)) {
                $message .= ' الخطوة التالية المسموحة: ' . implode(' أو ', $labels) . '.';
            }

            throw new BusinessRuleException($message, 409);
        }

        $this->forceSetStatus($order, $status, $changedBy, $changedByName, $note);

        return $order->load('histories');
    }

    /**
     * الحالات التالية المسموحة للانتقال إليها من حالة معينة (المصفوفة الصارمة).
     * تُعرض للواجهة في allowed_next لتخفي كل الانتقالات غير القانونية.
     */
    public function allowedNextByStatus(string $status, string $changedBy = PortalOrder::CHANGED_BY_ADMIN): array
    {
        $matrix = $changedBy === PortalOrder::CHANGED_BY_CUSTOMER
            ? self::ALLOWED_CUSTOMER_TRANSITIONS
            : self::ALLOWED_ADMIN_TRANSITIONS;

        return $matrix[$status] ?? [];
    }

    /**
     * كتابة الحالة + تسجيل السجل في معاملة واحدة.
     * الاستخدام: changeStatus (بعد التحقق من المصفوفة) و convertToSale
     * (التحويل هو القفزة القانونية الوحيدة إلى «تم التسليم»).
     */
    private function forceSetStatus(
        PortalOrder $order,
        string $status,
        string $changedBy,
        ?string $changedByName = null,
        ?string $note = null,
    ): void {
        DB::transaction(function () use ($order, $status, $changedBy, $changedByName, $note) {
            $order->forceFill(['status' => $status])->save();
            $this->recordHistory($order, $status, $changedBy, $changedByName, $note);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // تحويل الطلب إلى فاتورة (FV/POS) — هنا فقط تُفعَّل العمليات المالية
    // (المخزون، الطابع الجبائي، قيود الرصيد) عبر آلية التحويل القياسية.
    // ═══════════════════════════════════════════════════════════════════

    public function convertToSale(PortalOrder $order, string $targetCode = 'FV', array $payment = []): CommercialDocument
    {
        // قاعدة «التحويل مرة واحدة فقط»: أول تحويل ناجح يثبّت sale_document_id،
        // وأي محاولة ثانية (حتى من «تم التسليم») تُرفض — لا فاتورتين من طلب واحد.
        if ($order->is_converted) {
            throw new BusinessRuleException('تم تحويل هذا الطلب إلى فاتورة مسبقاً — التحويل مسموح مرة واحدة فقط.', 409);
        }

        // الطريقة الاحترافية: لا تحويل إلا بعد تأكيد الطلب (preparing → confirmed)
        // ومروره بمرحلة التحليل. «قيد الاعداد» يعني أن الزبون لم يثبّت الطلب بعد —
        // لا يجوز فوترته قبل موافقته.
        if ($order->status === PortalOrder::STATUS_PREPARING
            || $order->status === PortalOrder::LEGACY_PENDING) {
            throw new BusinessRuleException('يجب تأكيد الطلب أولاً (من الزبون أو من المسؤول) قبل تحويله إلى فاتورة.', 409);
        }
        if (in_array($order->status, [
            PortalOrder::STATUS_RETURNED,
            PortalOrder::STATUS_CANCELLED,
        ], true)) {
            throw new BusinessRuleException('لا يمكن تحويل طلب تم إرجاعه أو إلغاؤه إلى فاتورة.', 409);
        }

        // التحويل (إنشاء الفاتورة) + تسجيل الدفعة الاختيارية + كتابة الحالة
        // في معاملة واحدة — لا يمكن أن يبقى الطلب محوّلاً دون دفعة/سجل تام.
        return DB::transaction(function () use ($order, $targetCode, $payment) {
            $doc = $order->document ?? throw new ModelNotFoundException('المستند المرتبط بالطلب غير موجود');

            // لا تحقق مكرر من الهدف هنا: DocumentConversionService::convert يتحقق
            // بنفسه (من خريطة التحويل نفسها) أن الهدف مسموح من نوع المستند الفعلي،
            // والمسؤول محصور أصلاً في FV/POS في طبقة التحقق من الطلب.
            $sale = $this->converter->convert($doc, $targetCode);

            // قفل «التحويل مرة واحدة»: ربط الفاتورة الناتجة بالطلب داخل نفس
            // المعاملة — أي فشل لاحق يتراجع والطلب يبقى غير محوّل.
            $order->forceFill(['sale_document_id' => $sale->id])->save();

            // دفعة اختيارية تُربط بالفاتورة مباشرة عبر المسار القياسي
            // (PaymentSynchronizer) — نفس سلوك تعديل دفعات أي مستند.
            if (!empty($payment)) {
                $this->payments->syncPayments($sale, [$payment]);
            }

            // التحويل هو القفزة القانونية إلى «تم التسليم» من مؤكد/تم المعالجة/
            // الشحن — يُنفَّذ خارج المصفوفة الصارمة. من «تم التسليم» تبقى
            // الحالة كما هي، والسجل التوثيقي يُكتب في الحالتين.
            $this->forceSetStatus(
                $order,
                PortalOrder::STATUS_DELIVERED,
                PortalOrder::CHANGED_BY_ADMIN,
                auth()->user()?->name,
                "تم تحويل الطلب إلى فاتورة {$sale->document_number}"
            );

            return $sale;
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // تمثيل JSON (توحيد شكل الرد)
    // ═══════════════════════════════════════════════════════════════════

    public function toArray(PortalOrder $order, string $viewer = PortalOrder::CHANGED_BY_ADMIN): array
    {
        $order->loadMissing(['party', 'document.documentType', 'document.lines.product.tva', 'document.lines.product.unit', 'histories']);

        $doc = $order->document;

        return [
            'id'               => $order->id,
            'reference'        => $order->reference,
            'status'           => $order->status,
            'status_label'     => $order->status_label,
            // السماحيات حسب الجمهور: الزبون يرى فقط تأكيد/إلغاء (وقيد الاعداد)
            // ولا يرى أبداً انتقالات الإدارة (مثل delivered → returned).
            'allowed_next'     => $this->allowedNextByStatus($order->status, $viewer),
            'is_converted'     => $order->is_converted,
            'sale_document_id' => $order->sale_document_id ? (int) $order->sale_document_id : null,
            'notes'            => $order->notes,
            'customer_name'    => $order->customer_name,
            'customer_phone'   => $order->customer_phone,
            'customer_address' => $order->customer_address,
            'total_ht'         => (float) $order->total_ht,
            'total_tva'        => (float) $order->total_tva,
            'total_ttc'        => (float) $order->total_ttc,
            'total_discount'   => (float) ($doc?->total_discount ?? 0),
            'items_count'      => $doc?->lines?->count() ?? 0,
            'requested_at'     => $order->requested_at?->toISOString(),
            'created_at'       => $order->created_at?->toISOString(),
            'updated_at'       => $order->updated_at?->toISOString(),
            'party'            => $order->party ? [
                'id'             => $order->party->id,
                'name'           => $order->party->name,
                'code'           => $order->party->code,
                'phone'          => $order->party->phone,
                'is_tva_exempt'  => (bool) $order->party->is_tva_exempt,
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
                'line_id'              => $l->id,
                'product_id'           => $l->product_id,
                'product_name'         => $l->product?->name ?? $l->description,
                'product_ref'          => $l->product?->ref ?? null,
                'unit'                 => $l->product?->unit?->symbol ?? $l->product?->unit?->name,
                'unit_name'            => $l->product?->unit?->symbol ?? $l->product?->unit?->name,
                'quantity'             => (float) $l->quantity,
                'unit_price_ht'        => (float) $l->unit_price_ht,
                'packaging_id'         => $l->packaging_id,
                'pack_qty'             => (float) ($l->packaging_units_snapshot ?? 1),
                'tva_rate'             => (float) $l->tva_rate,
                'discount_percentage'  => (float) ($l->discount_percentage ?? 0),
                'total_discount_amount'=> (float) ($l->total_discount_amount ?? 0),
                'total_ht'             => (float) $l->total_ht,
                'total_tva'            => (float) $l->total_tva,
                'total_ttc'            => (float) $l->total_ttc,
                // النسبة الاسمية للمنتج (من جدول TVA) مقابل النسبة المخزّنة على
                // السطر. قد تختلف: زبون معفى جبائياً → السطر يخزّن 0 بينما المنتج
                // له نسبة حقيقية (مثال: قهوة بونال 250غ = 19%). نعرضها مع شارة
                // «معفى» ولا نعدّل بها الحسابات.
                'tva_rate_live'        => (float) ($l->product?->tva?->rate ?? $l->tva_rate),
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
     * معرف زبون الصندوق الافتراضي (Client Cash) لمؤسسة ما — يُنشأ عند الحاجة.
     *
     * الطلبات العامة (بدون حساب بوابة) لا تعرف زبوناً حقيقياً: تُربط بزبون
     * الصندوق وتبقى بيانات الزبون الحقيقية في customer_name/phone/address
     * على الطلب نفسه. هذا مرآة دقيقة لـ CommercialDocumentService::resolveCashPartyId
     * لضمان نفس السلوك في كل مكان (البيع المباشر + الطلب العام).
     */
    public function resolveCashPartyId(int $companyId): int
    {
        $party = Party::where('company_id', $companyId)
            ->where('slug', 'client-cash')
            ->first();

        if ($party) {
            return $party->id;
        }

        $clientTypeId = DB::table('party_types')
            ->where('company_id', $companyId)
            ->where('name', 'client')
            ->value('id')
            ?? DB::table('party_types')
                ->where('company_id', $companyId)
                ->value('id');

        $party = Party::create([
            'company_id'        => $companyId,
            'party_type_id'     => $clientTypeId,
            'code'              => 'CC000',
            'name'              => 'Client Cash',
            'slug'              => 'client-cash',
            'is_tva_exempt'     => true,
            'is_taxable'        => false,
            'is_final_consumer' => true,
            'active'            => true,
        ]);

        return $party->id;
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
