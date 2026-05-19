<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\NumberingSeries;
use App\Core\Exceptions\BusinessRuleException;
use App\Services\Tax\FiscalStampCalculator;
use App\Core\Services\TAPCalculator;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocument::class;
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
    // Hooks
    // ═══════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        // 1. تعيين company_id من السياق إذا لم يُرسَل
        if (empty($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }

        // 2. تعيين user_id من المستخدم المسجّل
        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        // 3. تعيين issued_at و exchange_rate
        $data = $this->prepareDocumentData($data);

        // 4. تعيين numbering_series_id تلقائياً
        if (empty($data['numbering_series_id'])) {
            $series = $this->resolveNumberingSeries(
                $data['document_type_id'] ?? null,
                $data['company_id']
            );
            $data['numbering_series_id'] = $series->id;
        }

        // 5. توليد رقم الوثيقة
        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber(
                $data['document_type_id'] ?? null,
                $data['company_id']         // ✅ مرّر company_id
            );
        }

        // 6. تعيين السنة المالية إذا لم تُرسَل
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId();
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        $this->calculateTotals($item);

        if ($item->documentStatus?->is_default) {
            $this->validateDocument($item, $request);
        }
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        if ($item->documentStatus?->triggers_stock_movement) {
            $this->createStockMovements($item);
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot modify locked document', 409);
        }

        if ($item->validated_at && !$request->user()->can('force_edit_document')) {
            throw new BusinessRuleException('Validated documents cannot be modified', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Exported documents cannot be modified', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot delete locked document', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Cannot delete exported document', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('Cannot delete document with payments', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate($data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        return $data;
    }

    /**
     * جلب سلسلة ترقيم نشطة أو إنشاء واحدة تلقائياً
     */
    private function resolveNumberingSeries(?int $documentTypeId, int $companyId): NumberingSeries
    {
        $series = NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first();

        if ($series) {
            return $series;
        }

        // إنشاء سلسلة افتراضية إن لم توجد (fallback آمن)
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

    private function getPrefixForDocumentType(?int $documentTypeId): string
    {
        return match ($documentTypeId) {
            1  => 'INV',
            2  => 'QT',
            3  => 'ORD',
            4  => 'DN',
            5  => 'CN',
            default => 'DOC',
        };
    }

    /**
     * توليد رقم وثيقة فريد scoped بالشركة
     */
 private function generateDocumentNumber(?int $documentTypeId, int $companyId): string
{
    $prefix = $this->getPrefixForDocumentType($documentTypeId);
    $year   = date('Y');
    $key    = $prefix . '-' . $year;

    $last = CommercialDocument::where('company_id', $companyId)
        ->where('document_number', 'like', $key . '%')
        ->orderByDesc('document_number')
        ->lockForUpdate()
        ->first();

    if ($last) {
        $parts = explode('-', $last->document_number);
        $seq = (int) end($parts) + 1;
    } else {
        $seq = 1;
    }

    return sprintf('%s-%s-%06d', $prefix, $year, $seq);
}

    private function getCurrentFiscalYearId(): ?int
    {
        return \App\Models\FiscalYear::where('is_current', true)->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) return 1.0;

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->first();

        return $rate?->rate ?? 1.0;
    }

    /**
     * إنشاء أسطر الوثيقة مع تعيين company_id وتنظيف packaging_id
     */
    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $lineOrder = 1;

        foreach ($lines as $lineData) {
            // الحقول الإلزامية للسطر
            $lineData['commercial_document_id'] = $document->id;
            $lineData['company_id']             = $document->company_id;
            $lineData['line_order']             = $lineOrder++;

            // packaging_id غير موجود في migration الأسطر — أزِله
            unset($lineData['packaging_id']);

            // احسب الإجماليات
            $this->calculateLineTotals($lineData);

            $document->lines()->create($lineData);
        }
    }

    private function calculateLineTotals(array &$lineData): void
    {
        $quantity  = (float) ($lineData['quantity']      ?? 1);
        $unitPrice = (float) ($lineData['unit_price_ht'] ?? 0);
        $discount  = (float) ($lineData['discount_percentage'] ?? 0);
        $tvaRate   = (float) ($lineData['tva_rate']      ?? 0);

        $totalHt        = $quantity * $unitPrice;
        $discountAmount = $totalHt * ($discount / 100);
        $afterDiscount  = $totalHt - $discountAmount;
        $totalTva       = $afterDiscount * ($tvaRate / 100);
        $totalTtc       = $afterDiscount + $totalTva;

        $lineData['total_ht']       = round($totalHt,        4);
        $lineData['discount_amount'] = round($discountAmount, 4);
        $lineData['total_tva']      = round($totalTva,       4);
        $lineData['total_ttc']      = round($totalTtc,       4);
    }

    private function calculateTotals(CommercialDocument $document): void
    {
        $document->load('lines');

        $lines        = $document->lines;
        $totalHt      = $lines->sum('total_ht');
        $totalTva     = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc     = $totalHt + $totalTva;
        $totalStamp   = (new FiscalStampCalculator())->calculate($document);
        $netToPay     = $totalTtc + $totalStamp;

        $document->update([
            'total_ht'         => $totalHt,
            'total_tva'        => $totalTva,
            'total_discount'   => $totalDiscount,
            'total_stamp'      => $totalStamp,
            'total_ttc'        => $totalTtc,
            'net_to_pay'       => $netToPay,
            'remaining_amount' => $netToPay,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Actions
    // ═══════════════════════════════════════════════════════════════

    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) return;

        $document->update([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id,
        ]);

        $this->createStockMovements($document);
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->payments()->exists()) {
            throw new BusinessRuleException('Cannot cancel document with payments', 409);
        }

        $document->update([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getCancelledStatusId(),
        ]);
    }

    public function getUnpaid()
    {
        return $this->model::unpaid()->with(['party', 'documentType'])->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->with(['party', 'documentType'])->get();
    }

    private function getCancelledStatusId(): int
    {
        return \App\Models\DocumentStatus::where('is_cancelled', true)->value('id') ?? 6;
    }

    private function createStockMovements(CommercialDocument $document): void
    {
        if (!$document->documentType) return;

        $direction = $document->documentType->affects_stock_direction;
        if ($direction === 0) return;

        $valuationService = app(InventoryValuationService::class);

        foreach ($document->lines as $line) {
            if (!$line->product) continue;

            $costPrice = $direction < 0
                ? $valuationService->getCostPriceForSale(
                    $line->product,
                    $document->warehouse_id,
                    $line->quantity
                )
                : (float) $line->unit_price_ht;

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $this->getStockMovementTypeId($direction),
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $line->quantity,
                'unit_price'                  => $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => $line->quantity * $costPrice,
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        return match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };
    }
}
