<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductPackagingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'product_id'    => $this->product_id,
            'code'          => $this->code,
            'label'         => $this->label,
            'quantity'      => $this->quantity,
            'barcode'       => $this->barcode,
            'is_default'    => $this->is_default,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}
