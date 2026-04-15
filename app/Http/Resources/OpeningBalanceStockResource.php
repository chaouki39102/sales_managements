<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalanceStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'product_variant_id' => $this->product_variant_id,
            'warehouse_id' => $this->warehouse_id,
            'opening_quantity' => $this->opening_quantity,
            'opening_value' => $this->opening_value,
            'average_cost_price' => $this->average_cost_price,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'fiscalYear' => $this->whenLoaded('fiscalYear', fn() => [
                    'id' => $this->fiscalYear->id,
                    'name' => $this->fiscalYear->name,
                ]),
                'productVariant' => $this->whenLoaded('productVariant', fn() => [
                    'id' => $this->productVariant->id,
                    'ref' => $this->productVariant->ref,
                    'variant_name' => $this->productVariant->variant_name,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
            ],
        ];
    }
}