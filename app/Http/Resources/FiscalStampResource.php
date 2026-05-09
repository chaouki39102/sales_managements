<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FiscalStampResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'name'        => $this->name,
            'min_amount'  => $this->min_amount,
            'max_amount'  => $this->max_amount,
            'stamp_value' => $this->stamp_value,
            'type'        => $this->type,
            'active'      => $this->active,
            'valid_from'  => $this->valid_from,
            'valid_to'    => $this->valid_to,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
