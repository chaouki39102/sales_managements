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

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentService — منطق مُبسَّط
 *
 * قواعد النظام:
 *   ✅ الإنشاء → الحالة مباشرة "validated" + حركات المخزون فوراً
 *   ✅ التعديل → مسموح دائماً ما لم يكن is_locked = true
 *   ✅ القفل   → is_locked عمود مستقل، لا علاقة له بالحالة
 *   ✅ الإلغاء → الحالة تصبح "cancelled" (في حالات نادرة جداً)
 *   ❌ لا مسودة، لا اعتماد لاحق، لا حذف، لا مرتجع
 *   ❌ حالات المالية (paid/overdue/partially_paid) لا تُدار هنا
 * ════════════════════════════════════════════════════════════════════════════
 */
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType', 'party', 'warehouse',
        'currency', 'documentStatus', 'lines.product',
        'lines.packaging',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeCreate
    // يُعدّ البيانات ويُولّد رقم المستند والسلسلة الترقيمية
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

        // تحقق من نوع الوثيقة
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        // السلسلة الترقيمية ورقم المستند
        if (empty($data['numbering_series_id'])) {
            $data['numbering_series_id'] = $this
                ->resolveNumberingSeries($documentType->id, $companyId)->id;
        }

        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($documentType, $companyId);
        }

        // السنة المالية
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId)
                ?? throw new BusinessRuleException('لا توجد سنة مالية مفتوحة.', 422);
        }

        // ✅ الحالة مباشرةً "validated" — لا مسودة
        $data['validated_at'] = now();
        $data['validated_by'] = auth()->id();
        $data['document_status_id'] = $this->getStatusId($companyId, 'validated');

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
    // إنشاء الأسطر + حساب الإجماليات + حركات المخزون — كل شيء في transaction واحد
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterCreate(Model $item, array $data, $request): void
    {
        $lines = $request?->input('lines') ?? $data['lines'] ?? [];

        if (!empty($lines)) {
            $this->createDocumentLines($item, $lines);
        }

        $this->recalculateTotals($item);

        // ✅ حركات المخزون فوراً بعد الإنشاء (لأن الوثيقة معتمدة مباشرةً)
        $item->load('documentType', 'lines.product');

        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }

        // ✅ ربط الدفعات إذا أُرسلت مع المستند
        $payments = $request?->input('payments') ?? $data['payments'] ?? [];
        if (!empty($payments)) {
            $this->attachPayments($item, $payments);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate
    // القاعدة الوحيدة: مقفول = ممنوع التعديل
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        // R1
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        // R2
        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // R3: لا تسمح بتغيير رقم المستند إذا كان مُعتمداً
        if (!empty($data['document_number']) && $data['document_number'] !== $item->document_number) {
            $currentStatusName = $item->documentStatus?->name
                ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
            $validatedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
            if (in_array($currentStatusName, $validatedStatuses, true)) {
                throw new BusinessRuleException(
                    'لا يمكن تغيير رقم مستند معتمد. رقم المستند محمي بعد الاعتماد.',
                    409
                );
            }
        }

        // R4: إذا كانت الوثيقة معتمدة وجاءت lines في الطلب → رفض
        // new_payments مسموح
        $hasLines = !empty($data['lines']) || !empty($request?->input('lines'));
        if ($hasLines) {
            $currentStatusName = $item->documentStatus?->name
                ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
            $protectedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
            if (in_array($currentStatusName, $protectedStatuses, true)) {
                throw new BusinessRuleException(
                    'لا يمكن تعديل أسطر مستند معتمد. الأسطر محمية بعد الاعتماد. استخدم مستند تصحيح أو مرتجع.',
                    409
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterUpdate
    // إعادة حساب الأسطر والإجماليات إذا تغيرت الأسطر
    // ─── ملاحظة: حركات المخزون لا تُعاد تلقائياً عند التعديل ───
    // TODO: إذا احتجت لذلك لاحقاً: احذف الحركات القديمة وأنشئ جديدة
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $lines       = $request?->input('lines')        ?? $data['lines']        ?? [];
        $newPayments = $request?->input('new_payments')  ?? $data['new_payments'] ?? [];
        $payments    = $request?->input('payments')      ?? $data['payments']     ?? [];

        // AU1: تحديث الأسطر
        if (!empty($lines)) {
            // ✅ حذف حركات المخزون المرتبطة أولاً (قبل حذف الأسطر)
            $this->deleteStockMovementsForDocument($item);

            // ✅ حذف الأسطر القديمة
            $item->lines()->delete();

            // ✅ إنشاء الأسطر الجديدة
            $this->createDocumentLines($item, $lines);
        }

        // إعادة حساب الإجماليات دائماً
        $this->recalculateTotals($item);

        // ✅ إعادة إنشاء حركات المخزون إذا تغيرت الأسطر
        if (!empty($lines)) {
            $item->load('documentType', 'lines.product');
            if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
                $this->createStockMovements($item);
            }
        }

        // AU2: دفعات جديدة (additive mode)
        if (!empty($newPayments)) {
            $this->attachNewPayments($item, $newPayments);
        }

        // دفعات كاملة (free mode — تُستبدَل الكاملة)
        if (!empty($payments) && empty($newPayments)) {
            $item->payments()->detach();
            $this->attachPayments($item, $payments);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeDelete — حذف ممنوع تماماً
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeDelete(Model $item): void
    {
        throw new BusinessRuleException(
            'لا يمكن حذف المستندات التجارية. استخدم الإلغاء بدلاً من الحذف.',
            409
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * قفل المستند — يمنع أي تعديل لاحق
     */
    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    /**
     * فتح قفل المستند
     */
    public function unlockDocument(CommercialDocument $document): void
    {
        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن فتح قفل وثيقة مُصدَّرة للمحاسبة.', 409);
        }

        $document->updateQuietly(['is_locked' => false]);
    }

    /**
     * إلغاء المستند — في حالات نادرة جداً
     * يضع الحالة "cancelled" ولا يؤثر على المخزون بأثر رجعي
     *
     * ⚠️ تنبيه: المخزون الذي تأثر عند الإنشاء لا يُعكس تلقائياً.
     *    إذا احتجت لعكس المخزون: أنشئ مستند مقابل (مرتجع) بدلاً من الإلغاء.
     */
    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة. افتح القفل أولاً.', 409);
        }

        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة تم تصديرها للمحاسبة.', 409);
        }

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getStatusId($document->company_id, 'cancelled'),
        ]);
    }

    /**
     * إضافة دفعات جديدة لمستند (وضع additive — لا تمس القديمة)
     */
    public function attachNewPaymentsPublic(CommercialDocument $document, array $payments): void
    {
        $this->attachNewPayments($document, $payments);
    }

    /**
     * جلب المستندات غير المسددة (remaining_amount > 0)
     */
    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    /**
     * جلب المستندات المتأخرة (due_date < today + remaining > 0)
     */
    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء أسطر الوثيقة
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
    // PRIVATE: ربط الدفعات بالمستند
    // ═══════════════════════════════════════════════════════════════════════

    private function attachPayments(CommercialDocument $document, array $payments): void
    {
        foreach ($payments as $paymentData) {
            if (empty($paymentData['payment_mode_id']) || empty($paymentData['amount'])) {
                continue;
            }

            $amount = (float) $paymentData['amount'];
            if ($amount <= 0) continue;

            // ✅ FIX1-3: إضافة الحقول المفقودة من المستند
            $payment = \App\Models\Payment::create([
                'company_id'         => $document->company_id,
                'payment_mode_id'    => (int) $paymentData['payment_mode_id'],
                'treasury_account_id'=> isset($paymentData['treasury_account_id'])
                                            ? (int) $paymentData['treasury_account_id']
                                            : null,
                'amount'             => $amount,
                'payment_date'       => $paymentData['payment_date'] ?? $document->document_date,
                'reference'          => $paymentData['reference'] ?? null,
                'notes'              => $paymentData['notes'] ?? null,
                'user_id'            => auth()->id(),
                // ✅ FIX1: fiscal_year_id من المستند
                'fiscal_year_id'     => $document->fiscal_year_id,
                // ✅ FIX2: party_id من المستند
                'party_id'           => $document->party_id,
                // ✅ FIX3: currency_id من المستند
                'currency_id'        => $document->currency_id,
                // ✅ FIX4: payment_number تلقائي
                'payment_number'     => $this->generatePaymentNumber($document->company_id),
                // ✅ FIX5: status = confirmed
                'status'             => 'confirmed',
            ]);

            $document->payments()->attach($payment->id, [
                'company_id'     => $document->company_id,
                'amount_applied' => $amount,
                'notes'          => $paymentData['notes'] ?? null,
            ]);
        }

        // ✅ إعادة حساب paid_amount و remaining_amount بعد ربط الدفعات
        $this->recalculatePaymentAmounts($document);
    }

    private function attachNewPayments(CommercialDocument $document, array $payments): void
    {
        // نفس منطق attachPayments تماماً — لكن لا تحذف القديمة
        $this->attachPayments($document, $payments);
    }

    private function deleteStockMovementsForDocument(CommercialDocument $document): void
    {
        try {
            // جلب IDs الأسطر
            $lineIds = $document->lines()->pluck('id');
            if ($lineIds->isEmpty()) return;

            // حذف حركات المخزون المرتبطة
            \App\Models\StockMovement::whereIn('commercial_document_line_id', $lineIds)
                ->delete();

        } catch (\Throwable $e) {
            Log::warning("deleteStockMovementsForDocument: فشل حذف حركات المخزون للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function generatePaymentNumber(int $companyId): string
    {
        return DB::transaction(function () use ($companyId) {
            $year = date('Y');
            $last = \App\Models\Payment::where('company_id', $companyId)
                ->where('payment_number', 'like', "PAY-{$year}-%")
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($last && $last->payment_number) {
                $parts = explode('-', $last->payment_number);
                $seq   = ((int) end($parts)) + 1;
            }

            return sprintf('PAY-%s-%06d', $year, $seq);
        });
    }

    private function recalculatePaymentAmounts(CommercialDocument $document): void
    {
        $document->load('payments');
        $paidAmount = (float) $document->payments->sum('pivot.amount_applied');

        $document->updateQuietly([
            'paid_amount'      => round($paidAmount, 4),
            'remaining_amount' => round(max(0, (float) $document->net_to_pay - $paidAmount), 4),
        ]);
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
            'remaining_amount' => round($netToPay,       4), // يُحدَّث لاحقاً بعد الدفعات
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
                'lot_number'                  => $line->lot_number ?? null,
                'is_validated'                => true,
                'user_id'                     => auth()->id(),
                'stock_balance_after'         => 0, // يُحدَّث بـ StockMovementObserver
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
