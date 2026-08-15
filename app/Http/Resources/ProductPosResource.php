<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ProductPosResource — نسخة مُقتطعة من ProductResource مخصّصة لقوائم POS Pro
 * و POS Pro Mobile (نقطة بيع). تُرجع فقط الحقول التي يستهلكها:
 *   - productToVariant() في resources/js/pos/utils/posHelpers.ts
 *   - POSProProductDrawer (البحث/الفلترة/الأسعار/التغليف/الخصومات/المخزون)
 *   - usePosProCart.addItem (CartItem) و POSProProductInfoModal
 *
 * القاعدة: أي حقل يُقرأ من `variant.product.*` أو `variant.*` في تدفق الـ POS
 * يجب أن يبقى هنا؛ أي حقل إداري/SEO غير مطلوب يُحذف لتقليل حجم الحمولة
 * (~981 منتج × عدد الحقول المحذوفة). الحقول المحذوفة (slug, meta_*, created_by…)
 * متاحة دائماً عبر الـ ProductResource الكامل في صفحات الإدارة.
 */
class ProductPosResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                        => $this->id,
            'name'                      => $this->name,
            'ref'                       => $this->ref,
            'barcode'                   => $this->barcode,
            'description'               => $this->description,
            'tva_id'                    => $this->tva_id,
            'unit_id'                   => $this->unit_id,
            'purchase_price_ht'         => $this->purchase_price_ht,
            'current_cost_price'        => $this->current_cost_price,
            'manages_stock'             => $this->manages_stock,
            'allow_negative_stock'      => $this->allow_negative_stock,
            'has_lots'                  => $this->has_lots,
            'has_expiration_date'       => $this->has_expiration_date,
            'min_stock_alert'           => $this->min_stock_alert,
            'max_stock_alert'           => $this->max_stock_alert,
            'manages_quantity_discounts'=> $this->manages_quantity_discounts,
            'is_sold_by_weight'         => $this->is_sold_by_weight,
            'weight'                    => $this->weight,
            'volume'                    => $this->volume,
            'length'                    => $this->length,
            'width'                     => $this->width,
            'height'                    => $this->height,
            'images'                    => $this->images,
            'default_image'             => $this->default_image,
            'active'                    => $this->active,
            'default_selling_price_ht'  => $this->default_selling_price_ht,

            // Relations — نفس الـ include الذي يرسله الـ POS (عندما يكون محمّلاً)
            'family'                    => new FamilyResource($this->whenLoaded('family')),
            'tva'                       => new TvaResource($this->whenLoaded('tva')),
            'unit'                      => new UnitResource($this->whenLoaded('unit')),
            'prices'                    => ProductPriceResource::collection($this->whenLoaded('prices')),
            'packagings'                => ProductPackagingResource::collection($this->whenLoaded('packagings')),
            'quantity_discounts'        => QuantityDiscountResource::collection($this->whenLoaded('quantityDiscounts')),
            'barcodes'                  => BarcodeResource::collection($this->whenLoaded('barcodes')),
        ];
    }
}
