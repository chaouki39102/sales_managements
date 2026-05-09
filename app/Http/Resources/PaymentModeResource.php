<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentModeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'company_id'           => $this->company_id,
            'name'                 => $this->name,
            'code'                 => $this->code,
            'description'          => $this->description,
            'treasury_account_id'  => $this->treasury_account_id,
            'requires_reference'   => $this->requires_reference,
            'is_cash'              => $this->is_cash,
            'active'               => $this->active,
            'display_order'        => $this->display_order,
            'created_at'           => $this->created_at,
            'updated_at'           => $this->updated_at,

            // Relations
            'treasury_account'     => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
        ];
    }
}
