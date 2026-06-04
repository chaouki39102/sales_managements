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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType', 'party', 'warehouse',
        'currency', 'documentStatus', 'lines.product',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeCreate
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        $data = parent::beforeCreate($data, $request);
        $data['company_id'] = $companyId;

        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        $data = $this->prepareDocumentData($data);

        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        if (empty($data['numbering_series_id'])) {
            $data['numbering_series_id'] = $this
                ->resolveNumberingSeries($documentType->id, $companyId)->id;
        }

        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($documentType, $companyId);
        }

        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId)
                ?? throw new BusinessRuleException('لا توجد سنة مالية مفتوحة.', 422);
        }

        $data['document_status_id'] = $this->getStatusId($companyId, 'draft');

        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterCreate
    //
    // الاكتشاف الجوهري: afterCreateCommitted لا تُستدعى من BaseService
    // — هي دالة معرّفة لكن BaseService لا يعرفها ولا يستدعيها.
    //
    // لذا كل المنطق يجب أن يكون هنا في afterCreate داخل نفس الـ transaction:
    //   1. إنشاء الأسطر (مع حساب إجمالياتها)
    //   2. حساب إجماليات الوثيقة
    //   3. التحقق من الوثيقة + إنشاء حركات المخزون
    //
    // ✅ الحركات داخل الـ transaction = إذا فشلت، تُلغى الوثيقة كاملاً
    //    هذا السلوك الصحيح — وثيقة بدون حركات مخزون = بيانات غير متسقة
    // ═══════════════════════════════════════════════════════════════════════

   protected function afterCreate(Model $item, array $data, $request): void
{
    // ✅ نأخذ lines من $request مباشرة — ضمان وصولها حتى لو صفّى BaseService $data
    $lines = $request?->input('lines') ?? $data['lines'] ?? [];

    if (!empty($lines)) {
        $this->createDocumentLines($item, $lines);
    }

    $this->recalculateTotals($item);

    $item->load('documentType', 'lines.product');
    $this->validateDocument($item, $request);
}

protected function afterUpdate(Model $item, array $data, $request): void
{
    $lines = $request?->input('lines') ?? $data['lines'] ?? [];

    if (!empty($lines)) {
        // حذف الأسطر القديمة وإعادة إنشاؤها (تعديل كامل)
        $item->lines()->delete();
        $this->createDocumentLines($item, $lines);
    }

    // ✅ دائماً إعادة الحساب عند أي تعديل
    $this->recalculateTotals($item);
}
    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterCreateCommitted — محتفَظ به للتوافق مع BaseService المستقبلي
    // إذا أضاف BaseService يوماً دعماً لهذه الدالة
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // لا شيء هنا — كل المنطق في afterCreate
        // إذا أضاف BaseService دعماً لهذه الدالة مستقبلاً:
        //   يجب نقل validateDocument() إلى هنا وإزالتها من afterCreate
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        if ($item->validated_at && $request?->user()?->cannot('force_edit_document')) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة معتمدة.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeDelete
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مقفلة.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة تم تصديرها للمحاسبة.', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مرتبطة بمدفوعات.', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * اعتماد الوثيقة — idempotent
     *
     * تُستدعى من:
     *   - afterCreate() عند إنشاء وثيقة جديدة
     *   - CommercialDocumentController::validateDocument() عند التحقق اليدوي
     *
     * idempotent: إذا validated_at موجودة → لا نفعل شيئاً
     */
    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return;
        }

        $document->updateQuietly([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id ?? auth()->id(),
        ]);

        $validatedStatusId = $this->getStatusId($document->company_id, 'validated');
        if ($validatedStatusId) {
            $document->updateQuietly(['document_status_id' => $validatedStatusId]);
        }

        $document->loadMissing('documentType', 'lines.product');

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

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getStatusId($document->company_id, 'cancelled'),
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

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء أسطر الوثيقة
    //
    // ✅ الإجماليات محسوبة في Service مباشرة لأن:
    //    CommercialDocumentLineObserver::saving() يعتمد على isDirty()
    //    الذي يُرجع false عند create() الجديد — لا قيم قديمة للمقارنة
    // ═══════════════════════════════════════════════════════════════════════

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $productIds = array_values(array_filter(array_column($lines, 'product_id')));
        if (!empty($productIds)) {
            $this->validateTenantRelationsMany(
                array_map('intval', $productIds),
                'products',
                $document->company_id
            );
        }

        foreach ($lines as $order => $lineData) {
            $totals = $this->computeLineTotals($lineData);

            $document->lines()->create([
                'company_id'             => $document->company_id,
                'commercial_document_id' => $document->id,
                'line_order'             => $order + 1,
                'product_id'             => (int) $lineData['product_id'],
                'description'            => $lineData['description'] ?? null,
                'quantity'               => (float) $lineData['quantity'],
                'unit_price_ht'          => (float) $lineData['unit_price_ht'],
                'discount_percentage'    => (float) ($lineData['discount_percentage'] ?? 0),
                'tva_rate'               => (float) ($lineData['tva_rate'] ?? 0),
                'packaging_id'           => $lineData['packaging_id'] ?? null,
                'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
                'line_attributes'        => $lineData['line_attributes'] ?? null,
                'total_ht'               => $totals['total_ht'],
                'discount_amount'        => $totals['discount_amount'],
                'total_tva'              => $totals['total_tva'],
                'total_ttc'              => $totals['total_ttc'],
            ]);
        }
    }

    private function computeLineTotals(array $line): array
    {
        $qty     = (float) ($line['quantity']            ?? 0);
        $price   = (float) ($line['unit_price_ht']       ?? 0);
        $discPct = (float) ($line['discount_percentage'] ?? 0);
        $tvaRate = (float) ($line['tva_rate']            ?? 0);

        $gross    = $qty * $price;
        $discount = $gross * ($discPct / 100);
        $ht       = $gross - $discount;
        $tva      = $ht * ($tvaRate / 100);

        return [
            'total_ht'        => round($ht,       4),
            'discount_amount' => round($discount,  4),
            'total_tva'       => round($tva,       4),
            'total_ttc'       => round($ht + $tva, 4),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: حساب إجماليات الوثيقة
    // ═══════════════════════════════════════════════════════════════════════

    private function recalculateTotals(CommercialDocument $document): void
    {
        $document->load('lines');

        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        $totalStamp = 0.0;
        try {
            $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
        } catch (\Throwable $e) {
            Log::warning("FiscalStamp error doc#{$document->id}: " . $e->getMessage());
        }

        $netToPay = $totalTtc + $totalStamp;

        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,       4),
            'total_discount'   => round($totalDiscount,  4),
            'total_stamp'      => round($totalStamp,     4),
            'total_ttc'        => round($totalTtc,       4),
            'net_to_pay'       => round($netToPay,       4),
            'remaining_amount' => round($netToPay,       4),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء حركات المخزون
    // ═══════════════════════════════════════════════════════════════════════

    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        $direction    = (int) ($documentType?->affects_stock_direction ?? 0);

        if ($direction === 0) return;

        if (!$document->warehouse_id || !$document->fiscal_year_id) {
            Log::warning("createStockMovements: missing warehouse or fiscal_year for doc#{$document->id}");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);
        $stockMovementTypeId = match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };

        foreach ($document->lines as $line) {
            if (!$line->product_id || !$line->product) continue;

            $costPrice = $direction < 0
                ? (float) $valuationService->getCostPriceForSale(
                    $line->product, $document->warehouse_id, (float) $line->quantity
                )
                : (float) $line->unit_price_ht;

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'fiscal_year_id'              => $document->fiscal_year_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => (float) $line->quantity,
                'unit_price'                  => (float) $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round((float) $line->quantity * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
                'user_id'                     => auth()->id(),
                // ✅ قيمة مبدئية — يُحدّثها StockMovementObserver::created() لاحقاً
                'stock_balance_after'         => 0,
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private function getStatusId(int $companyId, string $name): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', $name)
            ->value('id');
    }

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        return NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first()
            ?? NumberingSeries::create([
                'company_id'       => $companyId,
                'document_type_id' => $documentTypeId,
                'name'             => (DocumentType::where('id', $documentTypeId)->value('code') ?? 'DOC') . '-' . date('Y'),
                'prefix'           => DocumentType::where('id', $documentTypeId)->value('code') ?? 'DOC',
                'current_number'   => 0,
                'is_locked'        => false,
            ]);
    }

    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
{
    return DB::transaction(function () use ($documentType, $companyId) {
        $prefix = $documentType->code;
        $year   = date('Y');

        $last = CommercialDocument::where('company_id', $companyId)
            ->where('document_number', 'like', "{$prefix}-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        // ✅ المتغير المؤقت ضروري — end() تحتاج reference
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->document_number);
            $seq   = (int) end($parts) + 1;
        }

        return sprintf('%s-%s-%06d', $prefix, $year, $seq);
    });
}

    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) return 1.0;

        return (float) (\App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate') ?? 1.0);
    }
}
