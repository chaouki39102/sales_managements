<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Core\Exceptions\BusinessRuleException;
use App\Services\Tax\FiscalStampCalculator;
use App\Core\Services\TAPCalculator;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Commercial Document Service
 *
 * إدارة الوثائق التجارية (فواتير، عروض أسعار، أوامر شراء، إلخ)
 * - حساب الضرائب (TVA, Timbre, TAP)
 * - إدارة المخزون
 * - التحقق من صحة البيانات
 *
 * @package App\Services
 */
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

    protected function beforeCreate(array $data, $request): array
    {
        $data = $this->prepareDocumentData($data);

        if (!isset($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($data['document_type_id'] ?? null);
        }

        if (!isset($data['fiscal_year_id'])) {
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

        if ($item->documentStatus?->sends_notification) {
            // Send notification
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

    private function generateDocumentNumber(?int $documentTypeId): string
    {
        $prefix = match ($documentTypeId) {
            1 => 'INV',
            2 => 'QT',
            3 => 'ORD',
            4 => 'DN',
            5 => 'CN',
            default => 'DOC',
        };

        $year = date('Y');
        $sequence = $this->getNextSequence($prefix . $year);

        return sprintf('%s-%s-%06d', $prefix, $year, $sequence);
    }

    private function getNextSequence(string $prefix): int
    {
        $last = CommercialDocument::where('document_number', 'like', $prefix . '%')
            ->orderByDesc('document_number')
            ->first();

        if (!$last) {
            return 1;
        }

        $parts = explode('-', $last->document_number);
        return (int) end($parts) + 1;
    }

    private function getCurrentFiscalYearId(): ?int
    {
        $fiscalYear = \App\Models\FiscalYear::where('is_current', true)->first();
        return $fiscalYear?->id;
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->first();

        return $rate?->rate ?? 1.0;
    }

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $lineOrder = 1;

        foreach ($lines as $lineData) {
            $lineData['commercial_document_id'] = $document->id;
            $lineData['line_order'] = $lineOrder++;

            $this->calculateLineTotals($lineData);

            $document->lines()->create($lineData);
        }
    }

    private function calculateLineTotals(array &$lineData): void
    {
        $quantity = $lineData['quantity'] ?? 1;
        $unitPrice = $lineData['unit_price_ht'] ?? 0;

        $lineData['total_ht'] = $quantity * $unitPrice;

        if (!empty($lineData['discount_percentage'])) {
            $lineData['discount_amount'] = $lineData['total_ht'] * ($lineData['discount_percentage'] / 100);
        }

        $afterDiscount = $lineData['total_ht'] - ($lineData['discount_amount'] ?? 0);

        $tvaRate = $lineData['tva_rate'] ?? 0;
        $lineData['total_tva'] = $afterDiscount * ($tvaRate / 100);
        $lineData['total_ttc'] = $afterDiscount + $lineData['total_tva'];
    }

    private function calculateTotals(CommercialDocument $document): void
    {
        $lines = $document->lines;

        $totalHt = $lines->sum('total_ht');
        $totalTva = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc = $totalHt + $totalTva;

        $totalStamp = (new FiscalStampCalculator())->calculate($document);
        $netToPay = $totalTtc + $totalStamp;

        $document->update([
            'total_ht' => $totalHt,
            'total_tva' => $totalTva,
            'total_discount' => $totalDiscount,
            'total_stamp' => $totalStamp,
            'total_ttc' => $totalTtc,
            'net_to_pay' => $netToPay,
            'remaining_amount' => $netToPay,
        ]);
    }

    private function createStockMovements(CommercialDocument $document): void
    {
        $valuationService = app(InventoryValuationService::class);

        foreach ($document->lines as $line) {
            if (!$line->product) continue;

            $movementType = match ($document->documentType?->code) {
                'invoice', 'delivery_note' => 'out',
                'purchase_invoice' => 'in',
                default => null,
            };
            if (!$movementType) continue;

            $costPrice = $movementType === 'out'
                ? $valuationService->getCostPriceForSale($line->product, $document->warehouse_id, $line->quantity)
                : $line->unit_price_ht; // للمشتريات، سعر الشراء هو التكلفة

            StockMovement::create([
                'warehouse_id'           => $document->warehouse_id,
                'product_id'             => $line->product_id,
                'stock_movement_type_id' => $this->getStockMovementTypeId($movementType),
                'commercial_document_id' => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'               => $line->quantity,
                'unit_price'             => $line->unit_price_ht,
                'cost_price'             => $costPrice, // ✅ التعيين الصحيح
                'total_price'            => $line->quantity * $costPrice,
                'movement_date'          => $document->document_date,
                'packaging_id'           => $line->packaging_id ?? null,
                'price_source'           => $movementType === 'in' ? 'purchase' : 'sale',
                'is_validated'           => true,
            ]);
        }
    }


    private function getStockMovementTypeId(string $type): int
    {
        return match ($type) {
            'in' => 1,
            'out' => 2,
            'adjustment' => 3,
            default => 1,
        };
    }

    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return;
        }

        $document->update([
            'validated_at' => now(),
            'validated_by' => $request->user()->id ?? null,
        ]);
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
            'document_status_id' => $this->getCancelledStatusId(),
        ]);
    }

    private function getCancelledStatusId(): int
    {
        return \App\Models\DocumentStatus::where('is_cancelled', true)->value('id') ?? 6;
    }

    public function getUnpaid()
    {
        return $this->model::unpaid()->with(['party', 'documentType'])->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->with(['party', 'documentType'])->get();
    }
}
