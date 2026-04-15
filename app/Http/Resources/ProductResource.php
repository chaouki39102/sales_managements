<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Product Resource
 *
 * @package App\Http\Resources
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'family_id' => $this->family_id,
            'brand_id' => $this->brand_id,
            'product_type_id' => $this->product_type_id,
            'specifications' => $this->specifications,
            'images' => $this->images,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'meta_keywords' => $this->meta_keywords,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'family' => $this->whenLoaded('family', fn() => [
                    'id' => $this->family->id,
                    'name' => $this->family->name,
                ]),
                'brand' => $this->whenLoaded('brand', fn() => [
                    'id' => $this->brand->id,
                    'name' => $this->brand->name,
                ]),
                'productType' => $this->whenLoaded('productType', fn() => [
                    'id' => $this->productType->id,
                    'name' => $this->productType->name,
                ]),
                'variants' => $this->whenLoaded('variants', fn() => 
                    $this->variants->map(fn($variant) => [
                        'id' => $variant->id,
                        'sku' => $variant->sku,
                        'name' => $variant->name,
                        'price' => $variant->price,
                        'quantity' => $variant->quantity,
                    ])
                ),
            ],
        ];
    }
}
