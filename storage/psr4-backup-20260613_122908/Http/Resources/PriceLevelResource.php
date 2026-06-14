<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PriceLevelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'description'   => $this->description,
            'is_default'    => $this->is_default,
            'is_percentage' => $this->is_percentage,
            'value'         => $this->value,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}
