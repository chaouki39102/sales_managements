<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'company_id'   => $this->company_id,
            'product_id'   => $this->product_id,
            'sku'          => $this->sku,
            'barcode'      => $this->barcode,
            'price_type'   => $this->price_type,
            'price_value'  => $this->price_value,
            'stock'        => $this->stock,
            'track_stock'  => $this->track_stock,
            'attributes'   => $this->attributes,
            'image'        => $this->image,
            'image_url'    => $this->image,
            'weight'       => $this->weight,
            'volume'       => $this->volume,
            'active'       => $this->active,
            'created_by'   => $this->created_by,
            'updated_by'   => $this->updated_by,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
            'deleted_at'   => $this->deleted_at,

            // Relations
            'product'      => new ProductResource($this->whenLoaded('product')),
        ];
    }
}
