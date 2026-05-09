<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuantityDiscountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'product_id'         => $this->product_id,
            'price_level_id'     => $this->price_level_id,
            'min_qty'            => $this->min_qty,
            'max_qty'            => $this->max_qty,
            'discount_amount'    => $this->discount_amount,
            'discount_percentage'=> $this->discount_percentage,
            'tier_order'         => $this->tier_order,
            'is_blocked'         => $this->is_blocked,
            'active'             => $this->active,
            'created_at'         => $this->created_at,
            'updated_at'         => $this->updated_at,

            // Relations
            'price_level'        => new PriceLevelResource($this->whenLoaded('priceLevel')),
            'product'            => new ProductResource($this->whenLoaded('product')),
        ];
    }
}
