<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'description'      => $this->description,
            'family_id'        => $this->family_id,
            'brand_id'         => $this->brand_id,
            'product_type_id'  => $this->product_type_id,
            'images'           => $this->images ?? [],
            'active'           => $this->active,
            'created_at'       => $this->created_at?->toIso8601String(),
            'updated_at'       => $this->updated_at?->toIso8601String(),

            // ── العلاقات الأساسية ──
            'family' => $this->whenLoaded('family', fn() => $this->family ? [
                'id'   => $this->family->id,
                'name' => $this->family->name,
            ] : null),

            'brand' => $this->whenLoaded('brand', fn() => $this->brand ? [
                'id'   => $this->brand->id,
                'name' => $this->brand->name,
            ] : null),

            'productType' => $this->whenLoaded('productType', fn() => $this->productType ? [
                'id'           => $this->productType->id,
                'name'         => $this->productType->name,
                'label'        => $this->productType->label ?? null,
                'manages_stock'=> $this->productType->manages_stock,
            ] : null),

            // ── المتغيرات ──
            'variants' => $this->whenLoaded('variants', function () {
                return $this->variants->map(function ($variant) {
                    return [
                        'id'               => $variant->id,
                        'ref'              => $variant->ref,
                        'variant_name'     => $variant->variant_name,
                        'barcode'          => $variant->barcode,

                        // أسماء متوافقة مع Frontend
                        'purchase_price'   => (float) ($variant->last_purchase_price ?? 0),
                        'price_ht'         => (float) ($variant->default_selling_price_ht ?? 0),

                        'tva_id'           => $variant->tva_id,
                        'tva_rate'         => $variant->tva?->rate ?? 19,
                        'unit_id'          => $variant->unit_id,
                        'unit'             => $variant->relationLoaded('unit') && $variant->unit ? [
                            'id'     => $variant->unit->id,
                            'name'   => $variant->unit->name,
                            'symbol' => $variant->unit->symbol,
                        ] : null,

                        'min_stock'        => (float) ($variant->min_stock_alert ?? 0),
                        'active'           => (bool) $variant->active,
                        'stock_quantity'   => (float) ($variant->current_stock ?? 0),
                        'is_low_stock'     => (bool) ($variant->is_low_stock ?? false),

                        'manages_stock'              => (bool) $variant->manages_stock,
                        'allow_negative_stock'       => (bool) $variant->allow_negative_stock,
                        'has_lots'                   => (bool) $variant->has_lots,
                        'has_expiration_date'        => (bool) $variant->has_expiration_date,
                        'manages_quantity_discounts' => (bool) $variant->manages_quantity_discounts,

                        // أبعاد
                        'weight'  => $variant->weight,
                        'volume'  => $variant->volume,
                        'length'  => $variant->length,
                        'width'   => $variant->width,
                        'height'  => $variant->height,

                        'variant_attributes' => $variant->variant_attributes ?? [],

                        // ── الأسعار (العلاقة الصحيحة: prices وليس variantPrices) ──
                        'prices' => $variant->relationLoaded('prices')
                            ? $variant->prices->map(fn($price) => [
                                'id'             => $price->id,
                                'price_level_id' => $price->price_level_id,
                                'price'          => (float) $price->price,
                                'valid_from'     => $price->valid_from?->toDateString(),
                                'valid_to'       => $price->valid_to?->toDateString(),
                                'active'         => (bool) $price->active,
                                'priceLevel'     => $price->relationLoaded('priceLevel') && $price->priceLevel
                                    ? ['id' => $price->priceLevel->id, 'name' => $price->priceLevel->name]
                                    : null,
                            ])->toArray()
                            : [],

                        // ── تخفيضات الكميات ──
                        'quantity_discounts' => $variant->relationLoaded('quantityDiscounts')
                            ? $variant->quantityDiscounts->map(fn($d) => [
                                'id'                  => $d->id,
                                'min_quantity'        => (float) $d->min_quantity,
                                'max_quantity'        => $d->max_quantity ? (float) $d->max_quantity : null,
                                'discount_percentage' => $d->discount_percentage ? (float) $d->discount_percentage : null,
                                'discount_per_unit'   => $d->discount_per_unit ? (float) $d->discount_per_unit : null,
                                'tier_order'          => $d->tier_order,
                                'active'              => (bool) $d->active,
                                'valid_from'          => $d->valid_from?->toDateString(),
                                'valid_to'            => $d->valid_to?->toDateString(),
                            ])->toArray()
                            : [],
                    ];
                })->toArray();
            }),
        ];
    }
}
