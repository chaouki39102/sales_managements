<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'name'           => $this->name,
            'label'          => $this->label,
            'description'    => $this->description,
            'manages_stock'  => $this->manages_stock,
            'active'         => $this->active,
            'display_order'  => $this->display_order,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
