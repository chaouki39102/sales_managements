<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'product_id'      => $this->product_id,
            'price_level_id'  => $this->price_level_id,
            'pricing_method'  => $this->pricing_method,
            'price'           => $this->price,
            'rate'            => $this->rate,
            'margin'          => $this->margin,
            'active'          => $this->active,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,

            // Relations
            'price_level'     => new PriceLevelResource($this->whenLoaded('priceLevel')),
        ];
    }
}
