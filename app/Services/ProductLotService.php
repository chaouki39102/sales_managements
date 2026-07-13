<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductLot;
use App\Services\CompanyContextService;
use Illuminate\Http\Request;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['lot_number'])) {
            $data['lot_number'] = $this->generateLotNumber((int) ($data['product_id'] ?? 0));
        }

        return $data;
    }

    private function generateLotNumber(int $productId): string
    {
        $companyId = app(CompanyContextService::class)->get();
        $product   = $productId ? Product::find($productId) : null;
        $code      = $product?->ref ?: ($productId ?: 'GEN');
        $datePart  = now()->format('Ymd');

        $seq       = 1;
        $candidate = "LOT-{$code}-{$datePart}-{$seq}";

        while (
            ProductLot::withTrashed()
                ->where('company_id', $companyId)
                ->where('lot_number', $candidate)
                ->exists()
        ) {
            $seq++;
            $candidate = "LOT-{$code}-{$datePart}-{$seq}";
        }

        return $candidate;
    }
}
