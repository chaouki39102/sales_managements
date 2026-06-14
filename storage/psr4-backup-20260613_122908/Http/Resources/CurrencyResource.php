<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrencyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'company_id'       => $this->company_id,
            'name'             => $this->name,
            'code'             => $this->code,
            'symbol'           => $this->symbol,
            'decimal_places'   => $this->decimal_places,
            'is_base_currency' => $this->is_base_currency,
            'active'           => $this->active,
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
