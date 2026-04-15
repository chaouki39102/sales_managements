<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuantityDiscountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_variant_id' => $this->product_variant_id, 'min_quantity' => $this->min_quantity,
            'max_quantity' => $this->max_quantity, 'discount_per_unit' => $this->discount_per_unit,
            'discount_percentage' => $this->discount_percentage, 'tier_order' => $this->tier_order,
            'active' => $this->active, 'valid_from' => $this->valid_from?->toIso8601String(),
            'valid_to' => $this->valid_to?->toIso8601String(), 'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'relations' => ['productVariant' => $this->whenLoaded('productVariant', fn() => ['id' => $this->productVariant->id, 'ref' => $this->productVariant->ref])],
        ];
    }
}