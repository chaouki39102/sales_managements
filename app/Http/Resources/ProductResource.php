<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                        => $this->id,
            'company_id'                => $this->company_id,
            'name'                      => $this->name,
            'slug'                      => $this->slug,
            'ref'                       => $this->ref,
            'barcode'                   => $this->barcode,
            'description'               => $this->description,
            'family_id'                 => $this->family_id,
            'brand_id'                  => $this->brand_id,
            'product_type_id'           => $this->product_type_id,
            'tva_id'                    => $this->tva_id,
            'unit_id'                   => $this->unit_id,
            'purchase_price_ht'         => $this->purchase_price_ht,
            'current_cost_price'        => $this->current_cost_price,
            'min_margin_percentage'     => $this->min_margin_percentage,
            'manages_stock'             => $this->manages_stock,
            'allow_negative_stock'      => $this->allow_negative_stock,
            'has_lots'                  => $this->has_lots,
            'has_expiration_date'       => $this->has_expiration_date,
            'min_stock_alert'           => $this->min_stock_alert,
            'max_stock_alert'           => $this->max_stock_alert,
            'manages_quantity_discounts'=> $this->manages_quantity_discounts,
            'weight'                    => $this->weight,
            'volume'                    => $this->volume,
            'length'                    => $this->length,
            'width'                     => $this->width,
            'height'                    => $this->height,
            'valuation_method_id'       => $this->valuation_method_id,
            'specifications'            => $this->specifications,
            'images'                    => $this->images,
            'meta_title'                => $this->meta_title,
            'meta_description'          => $this->meta_description,
            'meta_keywords'             => $this->meta_keywords,
            'active'                    => $this->active,
            'created_by'                => $this->created_by,
            'updated_by'                => $this->updated_by,
            'created_at'                => $this->created_at,
            'updated_at'                => $this->updated_at,
            'deleted_at'                => $this->deleted_at,
            'default_selling_price_ht'  => $this->default_selling_price_ht,

            // Relations
            'family'                    => new FamilyResource($this->whenLoaded('family')),
            'brand'                     => new BrandResource($this->whenLoaded('brand')),
            'product_type'              => new ProductTypeResource($this->whenLoaded('productType')),
            'tva'                       => new TvaResource($this->whenLoaded('tva')),
            'unit'                      => new UnitResource($this->whenLoaded('unit')),
            'valuation_method'          => new InventoryValuationMethodResource($this->whenLoaded('valuationMethod')),
            'prices'                    => ProductPriceResource::collection($this->whenLoaded('prices')),
            'packagings'                => ProductPackagingResource::collection($this->whenLoaded('packagings')),
            'variants'                  => ProductVariantResource::collection($this->whenLoaded('variants')),
            'barcodes'                  => BarcodeResource::collection($this->whenLoaded('barcodes')),
        ];
    }
}
