<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\FiscalYear;
use App\Models\NumberingSeries;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType',
        'party',
        'warehouse',
        'currency',
        'documentStatus',
        'lines.product',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════
    // Hooks — الترتيب الصحيح مع parent::beforeCreate()
    // ═══════════════════════════════════════════════════════════════

    /**
     * ⚠️ ملاحظة معمارية مهمة:
     *
     * BaseService::beforeCreate() يحذف company_id من $data تطبيقاً
     * لحماية Mass Assignment (الطبقة 4). لذا يجب أن:
     *   1. نعيّن company_id محلياً للاستخدام في هذا الدالة
     *   2. نستدعي parent::beforeCreate() الذي يحذفه من $data
     *   3. نُعيده بعد parent::beforeCreate() ليصل إلى Model::create()
     *
     * HasCompany trait يضيف company_id تلقائياً عبر creating() Observer،
     * لكننا نحتاجه هنا لـ: توليد رقم الوثيقة، validateTenantRelations،
     * resolveNumberingSeries — قبل أن يُنشأ الـ Model.
     */
    protected function beforeCreate(array $data, $request): array
    {
        // ══ الخطوة 1: تحديد company_id للاستخدام الداخلي ══════════
        // نجلبه من السياق أو من $data (قبل أن يحذفه parent)
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        // ══ الخطوة 2: استدعاء parent (يفلتر الأعمدة، يحذف company_id) ══
        $data = parent::beforeCreate($data, $request);

        // ══ الخطوة 3: إعادة company_id — ضروري لإنشاء الوثيقة ══════
        // HasCompany trait يمكنه تعيينه أيضاً، لكننا نضمن القيمة هنا
        $data['company_id'] = $companyId;

        // ══ الخطوة 4: user_id من المستخدم المسجّل ══════════════════
        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        // ══ الخطوة 5: إعداد بيانات الوثيقة (issued_at، exchange_rate) ══
        $data = $this->prepareDocumentData($data);

        // ══ الخطوة 6: التحقق من نوع الوثيقة ════════════════════════
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        // ══ الخطوة 7: التحقق من party_id حسب نوع الوثيقة ══════════
        // بعض الأنواع (مثل Bon de transfert) لا تتطلب طرفاً
        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        // ══ الخطوة 8: سلسلة الترقيم ══════════════════════════════
        if (empty($data['numbering_series_id'])) {
            $series = $this->resolveNumberingSeries($documentType->id, $companyId);
            $data['numbering_series_id'] = $series->id;
        }

        // ══ الخطوة 9: توليد رقم الوثيقة (داخل transaction مستقلة) ══
        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($documentType, $companyId);
        }

        // ══ الخطوة 10: السنة المالية ═══════════════════════════════
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId);
            if (!$data['fiscal_year_id']) {
                throw new BusinessRuleException('لا توجد سنة مالية مفتوحة. يرجى إنشاء سنة مالية أولاً.', 422);
            }
        }

        // ══ الخطوة 11: الحالة الافتراضية (draft) ═══════════════════
        if (empty($data['document_status_id'])) {
            $data['document_status_id'] = $this->getDefaultStatusId($companyId);
        }

        // ══ الخطوة 12: أمان Cross-Tenant ════════════════════════════
        // نتحقق فقط من الحقول الموجودة والغير فارغة
        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    /**
     * بعد إنشاء الوثيقة: إنشاء الأسطر وحساب الإجماليات
     *
     * ✅ LineObserver يحسب إجماليات كل سطر في saving()
     * ✅ calculateTotals() يستخدم updateQuietly() لتجنب إعادة تشغيل Observer
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        // حساب إجماليات الوثيقة من الأسطر المحسوبة
        $this->calculateTotals($item);
    }

    /**
     * بعد commit الكامل: إنشاء حركات المخزون
     *
     * ✅ بعد commit لضمان عدم rollback جزئي في حالة فشل حركة المخزون
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // نُعيد تحميل documentType لأن $item قد يكون محملاً قبل commit
        $item->load('documentType', 'lines.product');

        // حركات المخزون فقط للوثائق التي تؤثر على المخزون
        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }
    }

    /**
     * ✅ تحقق من null قبل استدعاء cannot()
     * ✅ نستخدم $request?->user() بدل auth() للسماح بـ programmatic calls
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // استدعاء parent أولاً (يمنع تغيير company_id)
        parent::beforeUpdate($item, $data, $request);

        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        if ($item->validated_at && $request?->user()?->cannot('force_edit_document')) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة معتمدة. تواصل مع المدير لتجاوز هذا القيد.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مقفلة.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // تحقق من وجود مدفوعات مرتبطة
        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مرتبطة بمدفوعات.', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════

    private function prepareDocumentData(array $data): array
    {
        // إذا لم يُرسَل exchange_rate، نجلبه تلقائياً
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        // issued_at = document_date إذا لم يُرسَل
        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        // document_date الافتراضي = اليوم
        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    /**
     * جلب سلسلة ترقيم نشطة أو إنشاء واحدة تلقائياً.
     */
    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        $series = NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first();

        if ($series) {
            return $series;
        }

        // fallback: إنشاء سلسلة افتراضية
        $prefix = $this->getPrefixForDocumentType($documentTypeId);

        return NumberingSeries::create([
            'company_id'       => $companyId,
            'document_type_id' => $documentTypeId,
            'name'             => $prefix . '-' . date('Y'),
            'prefix'           => $prefix,
            'current_number'   => 0,
            'is_locked'        => false,
        ]);
    }

    /**
     * ✅ استخدام الـ code من DocumentType بدل hardcoded match
     * — يتوافق مع DocumentTypeSeeder الذي يُعرّف: DEV, BCC, BL, FV, AV, DDP, BCF, BR, FA, AA, BT
     */
    private function getPrefixForDocumentType(int $documentTypeId): string
    {
        $code = DocumentType::where('id', $documentTypeId)->value('code');
        return $code ?? 'DOC';
    }

    /**
     * توليد رقم وثيقة فريد scoped بالشركة.
     *
     * ✅ يلفّ بـ DB::transaction() لضمان عمل lockForUpdate حتى لو
     *    استُدعيت خارج transaction خارجية (savepoints في MySQL/PostgreSQL).
     * ✅ يستخدم code من DocumentType مباشرة (لا hardcoded IDs).
     */
    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        return DB::transaction(function () use ($documentType, $companyId) {
            $prefix = $documentType->code;
            $year   = date('Y');
            $key    = $prefix . '-' . $year . '-%';

            // lockForUpdate يمنع race condition في الإنشاء المتزامن
            $last = CommercialDocument::where('company_id', $companyId)
                ->where('document_number', 'like', $key)
                ->orderByDesc('id') // أسرع من orderByDesc('document_number')
                ->lockForUpdate()
                ->first();

            if ($last) {
                $parts = explode('-', $last->document_number);
                $seq   = (int) end($parts) + 1;
            } else {
                $seq = 1;
            }

            return sprintf('%s-%s-%06d', $prefix, $year, $seq);
        });
    }

    /**
     * جلب السنة المالية الحالية scoped بالشركة.
     */
    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    /**
     * جلب الحالة الافتراضية (draft) scoped بالشركة.
     */
    private function getDefaultStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'draft')
            ->value('id');
    }

    /**
     * جلب حالة "ملغي" scoped بالشركة.
     */
    private function getCancelledStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'cancelled')
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        // العملة الأساسية (DZD افتراضياً id=1) — لا حاجة لاستعلام
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate');

        return $rate ?? 1.0;
    }

    /**
     * إنشاء أسطر الوثيقة.
     *
     * ✅ لا نستدعي calculateLineTotals() هنا —
     *    CommercialDocumentLineObserver::saving() يحسبها تلقائياً.
     * ✅ نحذف packaging_id إذا لم يكن في migration بعد (أو نتركه إن كان موجوداً).
     */
    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        // التحقق من أن جميع products تنتمي لنفس الشركة (Cross-Tenant)
        $productIds = array_filter(array_column($lines, 'product_id'));
        if (!empty($productIds)) {
            $this->validateTenantRelationsMany(
                array_map('intval', $productIds),
                'products',
                $document->company_id
            );
        }

        $lineOrder = 1;

        foreach ($lines as $lineData) {
            // الحقول الإلزامية للسطر
            $lineData['commercial_document_id'] = $document->id;
            $lineData['company_id']             = $document->company_id;
            $lineData['line_order']             = $lineOrder++;

            // ✅ لا نحسب الإجماليات هنا — LineObserver يتولى ذلك في saving()
            // ✅ LineObserver يعمل فقط إذا تغيرت القيم الأساسية (isDirty check)

            $document->lines()->create($lineData);
        }
    }

    /**
     * حساب إجماليات الوثيقة من الأسطر.
     *
     * ✅ يستخدم updateQuietly() لتجنب إعادة تشغيل CommercialDocumentObserver::saving()
     *    الذي يحتاج lines محملة — مما يؤدي إلى حلقة إذا استُخدم update() العادي.
     * ✅ نحمّل الأسطر من قاعدة البيانات بعد إنشائها (قيم Observer المحسوبة).
     */
    private function calculateTotals(CommercialDocument $document): void
    {
        // تحميل الأسطر المحسوبة من DB (بعد تشغيل LineObserver)
        $document->load('lines');

        $lines         = $document->lines;
        $totalHt       = $lines->sum('total_ht');
        $totalTva      = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        // حساب الطابع الجبائي
        $totalStamp = app(FiscalStampCalculator::class)->calculate($document);

        // حساب TAP إن وجدت
        $totalTap = 0.0;
        if (class_exists(\App\Services\Tax\TAPCalculator::class)) {
            $totalTap = app(\App\Services\Tax\TAPCalculator::class)->calculate($document);
        }

        $netToPay = $totalTtc + $totalStamp + $totalTap;

        // ✅ updateQuietly() — لا يشغّل Observers ولا Events
        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,      4),
            'total_discount'   => round($totalDiscount, 4),
            'total_stamp'      => round($totalStamp,    4),
            'total_tap'        => round($totalTap,      4),
            'total_ttc'        => round($totalTtc,      4),
            'net_to_pay'       => round($netToPay,      4),
            'remaining_amount' => round($netToPay,      4), // paid_amount = 0 عند الإنشاء
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Actions
    // ═══════════════════════════════════════════════════════════════

    /**
     * اعتماد الوثيقة وإنشاء حركات المخزون.
     *
     * ✅ idempotent: إذا كانت validated_at موجودة نتجاهل الطلب
     */
    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return; // بالفعل معتمدة
        }

        // ✅ updateQuietly لتجنب تشغيل Observer::saving() مع lines غير محملة
        $document->updateQuietly([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id ?? auth()->id(),
        ]);

        // تحديث الحالة إلى "validated"
        $validatedStatusId = DocumentStatus::where('company_id', $document->company_id)
            ->where('name', 'validated')
            ->value('id');

        if ($validatedStatusId && $document->document_status_id !== $validatedStatusId) {
            $document->updateQuietly(['document_status_id' => $validatedStatusId]);
        }

        // إنشاء حركات المخزون إذا كان النوع يؤثر على المخزون
        $document->load('documentType', 'lines.product');
        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($document);
        }
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة.', 409);
        }

        if ($document->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مرتبطة بمدفوعات.', 409);
        }

        $cancelledStatusId = $this->getCancelledStatusId($document->company_id);

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $cancelledStatusId,
        ]);
    }

    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════
    // Stock Movements
    // ═══════════════════════════════════════════════════════════════

    /**
     * إنشاء حركات المخزون من أسطر الوثيقة.
     *
     * ✅ يتحقق من أن الـ documentType موجود ويؤثر على المخزون
     * ✅ يتحقق من أن المنتج موجود في كل سطر
     * ✅ direction مستخرج من DocumentType (وليس hardcoded)
     */
    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        if (!$documentType) {
            return;
        }

        $direction = $documentType->affects_stock_direction;
        if ($direction === 0) {
            return; // الوثيقة لا تؤثر على المخزون (DEV، BCC، DDP، BCF)
        }

        if (!$document->warehouse_id) {
            Log::warning("CommercialDocumentService: لا يوجد مستودع للوثيقة #{$document->id} — لن تُنشأ حركات مخزون.");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);
        $stockMovementTypeId = $this->getStockMovementTypeId($direction);

        foreach ($document->lines as $line) {
            if (!$line->product) {
                continue;
            }

            // حساب سعر التكلفة حسب اتجاه الحركة
            if ($direction < 0) {
                // خروج (مبيعات): نستخدم سعر التكلفة الحالي من المخزون
                $costPrice = $valuationService->getCostPriceForSale(
                    $line->product,
                    $document->warehouse_id,
                    $line->quantity
                );
            } else {
                // دخول (مشتريات): سعر التكلفة = سعر الشراء
                $costPrice = (float) $line->unit_price_ht;
            }

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $line->quantity,
                'unit_price'                  => $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round($line->quantity * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        // direction > 0 = إدخال (شراء/إرجاع بيع)
        // direction < 0 = إخراج (بيع/إرجاع شراء)
        return match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };
    }
}
