<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_variant_id' => $this->product_variant_id, 'price_level_id' => $this->price_level_id,
            'price' => $this->price, 'valid_from' => $this->valid_from?->toIso8601String(),
            'valid_to' => $this->valid_to?->toIso8601String(), 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_valid' => $this->is_valid,
            'relations' => [
                'productVariant' => $this->whenLoaded('productVariant', fn() => ['id' => $this->productVariant->id, 'ref' => $this->productVariant->ref]),
                'priceLevel' => $this->whenLoaded('priceLevel', fn() => ['id' => $this->priceLevel->id, 'name' => $this->priceLevel->name]),
            ],
        ];
    }
}