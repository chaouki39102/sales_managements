<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'price_type' => $this->price_type,
            'price_value' => $this->price_value,
            'final_price' => $this->final_price,
            'stock' => $this->stock,
            'track_stock' => (bool) $this->track_stock,
            'is_in_stock' => $this->is_in_stock,
            'attributes' => $this->attributes,
            'image' => $this->image,
            'weight' => $this->weight,
            'volume' => $this->volume,
            'active' => (bool) $this->active,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'barcodes' => BarcodeResource::collection($this->whenLoaded('barcodes')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
