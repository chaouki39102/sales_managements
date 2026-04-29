<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ProductResource
 *
 * يعكس البنية الجديدة:
 * - لا product_variants
 * - prices بدون price_computed (الحساب في الواجهة أو عند الطلب)
 * - packagings (Colisages)
 * - quantity_discounts مرتبطة بـ price_level
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $purchasePrice = (float) $this->purchase_price_ht;

        return [
            // ── المعلومات الأساسية ──
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'ref'         => $this->ref,
            'barcode'     => $this->barcode,
            'description' => $this->description,
            'images'      => $this->images ?? [],
            'active'      => (bool) $this->active,

            // ── التصنيف ──
            'family_id'       => $this->family_id,
            'brand_id'        => $this->brand_id,
            'product_type_id' => $this->product_type_id,

            // ── الضريبة والوحدة ──
            'tva_id'  => $this->tva_id,
            'unit_id' => $this->unit_id,

            // ── التسعير ──
            'purchase_price_ht' => $purchasePrice,

            // ── المخزون ──
            'manages_stock'              => (bool) $this->manages_stock,
            'allow_negative_stock'       => (bool) $this->allow_negative_stock,
            'has_lots'                   => (bool) $this->has_lots,
            'has_expiration_date'        => (bool) $this->has_expiration_date,
            'min_stock_alert'            => (float) $this->min_stock_alert,
            'max_stock_alert'            => (float) $this->max_stock_alert,
            'manages_quantity_discounts' => (bool) $this->manages_quantity_discounts,
            'valuation_method_id'        => $this->valuation_method_id,

            // ── مؤشرات المخزون (محسوبة) ──
            'current_stock' => (float) $this->current_stock,
            'is_low_stock'  => (bool)  $this->is_low_stock,

            // ── الأبعاد ──
            'weight' => $this->weight ? (float)$this->weight : null,
            'volume' => $this->volume ? (float)$this->volume : null,
            'length' => $this->length ? (float)$this->length : null,
            'width'  => $this->width  ? (float)$this->width  : null,
            'height' => $this->height ? (float)$this->height : null,

            // ── تواريخ ──
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // ══════════════════════════════════════════════════
            // العلاقات (تُجلَب فقط إذا كانت محمّلة)
            // ══════════════════════════════════════════════════

            'family' => $this->whenLoaded('family', fn() => $this->family ? [
                'id' => $this->family->id, 'name' => $this->family->name,
            ] : null),

            'brand' => $this->whenLoaded('brand', fn() => $this->brand ? [
                'id' => $this->brand->id, 'name' => $this->brand->name,
            ] : null),

            'productType' => $this->whenLoaded('productType', fn() => $this->productType ? [
                'id'            => $this->productType->id,
                'name'          => $this->productType->name,
                'label'         => $this->productType->label,
                'manages_stock' => (bool)$this->productType->manages_stock,
            ] : null),

            'tva' => $this->whenLoaded('tva', fn() => $this->tva ? [
                'id' => $this->tva->id, 'rate' => (float)$this->tva->rate, 'name' => $this->tva->name,
            ] : null),

            'unit' => $this->whenLoaded('unit', fn() => $this->unit ? [
                'id' => $this->unit->id, 'name' => $this->unit->name, 'symbol' => $this->unit->symbol,
            ] : null),

            'valuationMethod' => $this->whenLoaded('valuationMethod', fn() => $this->valuationMethod ? [
                'id' => $this->valuationMethod->id, 'name' => $this->valuationMethod->name,
                'method' => $this->valuationMethod->method,
            ] : null),

            // ── وحدات التعبئة (Colisages) ──
            'packagings' => $this->whenLoaded('packagings', fn() =>
                $this->packagings->map(fn($p) => [
                    'id'            => $p->id,
                    'code'          => $p->code,
                    'label'         => $p->label,
                    'quantity'      => (float)$p->quantity,
                    'barcode'       => $p->barcode,
                    'is_default'    => (bool)$p->is_default,
                    'active'        => (bool)$p->active,
                    'display_order' => $p->display_order,
                ])->values()
            ),

            // ── التعريفات (Tarifs) ──
            // price_ht = السعر المحسوب من PHP (يُرسَل للواجهة جاهزاً)
            'prices' => $this->whenLoaded('prices', fn() =>
                $this->prices->map(fn($pp) => [
                    'id'             => $pp->id,
                    'price_level_id' => $pp->price_level_id,
                    'price_level'    => $pp->relationLoaded('priceLevel') && $pp->priceLevel ? [
                        'id'   => $pp->priceLevel->id,
                        'name' => $pp->priceLevel->name,
                    ] : null,
                    'pricing_method' => $pp->pricing_method,
                    // قيم الإدخال (للتعديل في الفورم)
                    'price'  => $pp->price  !== null ? (float)$pp->price  : null,
                    'rate'   => $pp->rate   !== null ? (float)$pp->rate   : null,
                    'margin' => $pp->margin !== null ? (float)$pp->margin : null,
                    // السعر المحسوب النهائي (للعرض والفاتورة)
                    'price_ht' => $pp->computePrice($purchasePrice),
                    'active'   => (bool)$pp->active,
                ])->values()
            ),

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts' => $this->whenLoaded('quantityDiscounts', fn() =>
                $this->quantityDiscounts->map(fn($d) => [
                    'id'                  => $d->id,
                    'price_level_id'      => $d->price_level_id,
                    'price_level'         => $d->relationLoaded('priceLevel') && $d->priceLevel ? [
                        'id'   => $d->priceLevel->id,
                        'name' => $d->priceLevel->name,
                    ] : null,
                    'min_qty'             => (float)$d->min_qty,
                    'max_qty'             => $d->max_qty !== null ? (float)$d->max_qty : null,
                    'discount_amount'     => $d->discount_amount     !== null ? (float)$d->discount_amount     : null,
                    'discount_percentage' => $d->discount_percentage !== null ? (float)$d->discount_percentage : null,
                    'tier_order'          => $d->tier_order,
                    'is_blocked'          => (bool)$d->is_blocked,
                    'active'              => (bool)$d->active,
                ])->values()
            ),
        ];
    }
}
