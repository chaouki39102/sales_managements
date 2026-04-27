<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'images' => $this->images,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // العلاقات الرئيسية
            'family' => $this->whenLoaded('family', fn () => [
                'id'   => $this->family->id,
                'name' => $this->family->name,
            ]),
            'brand' => $this->whenLoaded('brand', fn () => [
                'id'   => $this->brand->id,
                'name' => $this->brand->name,
            ]),
            'productType' => $this->whenLoaded('productType', fn () => [
                'id'   => $this->productType->id,
                'name' => $this->productType->name,
            ]),

            // المتغيرات (Product Variants)
            'variants' => $this->whenLoaded('variants', function () {
                return $this->variants->map(function ($variant) {
                    return [
                        'id'               => $variant->id,
                        'ref'              => $variant->ref,
                        'variant_name'     => $variant->variant_name,
                        'barcode'          => $variant->barcode,
                        'purchase_price'   => $variant->last_purchase_price ?? 0,
                        'price_ht'         => $variant->default_selling_price_ht ?? 0,
                        'tva_rate'         => $variant->tva->rate ?? 19,
                        'unit_id'          => $variant->unit_id,
                        'min_stock'        => $variant->min_stock_alert ?? 0,
                        'active'           => $variant->active,
                        'stock_quantity'   => $variant->current_stock ?? 0,

                        // أسعار المستويات (Price Levels) – تُجلَب إن كانت العلاقة محملة
                        'prices' => $variant->relationLoaded('variantPrices')
                            ? $variant->variantPrices->map(fn ($price) => [
                                'price_level_id' => $price->price_level_id,
                                'price'          => $price->price,
                                'priceLevel'     => $price->relationLoaded('priceLevel')
                                    ? ['name' => $price->priceLevel->name]
                                    : null,
                            ])->toArray()
                            : [],
                    ];
                })->toArray();
            }),
        ];
    }
}
