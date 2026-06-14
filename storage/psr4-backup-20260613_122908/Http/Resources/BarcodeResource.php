<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BarcodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'product_id'  => $this->product_id,
            'variant_id'  => $this->variant_id,
            'barcode'     => $this->barcode,
            'type'        => $this->type,
            'is_primary'  => $this->is_primary,
            'unit'        => $this->unit,
            'created_by'  => $this->created_by,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,

            // Relations
            'product'     => new ProductResource($this->whenLoaded('product')),
            'variant'     => new ProductVariantResource($this->whenLoaded('variant')),
        ];
    }
}
