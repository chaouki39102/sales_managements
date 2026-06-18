<?php

// app/Http/Resources/TreasuryAccountResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'company_id'              => $this->company_id,
            'name'                    => $this->name,
            'code'                    => $this->code,
            'treasury_account_type_id'=> $this->treasury_account_type_id,
            'bank_name'               => $this->bank_name,
            'account_number'          => $this->account_number,
            'rib'                     => $this->rib,
            'iban'                    => $this->iban,
            'swift_bic'               => $this->swift_bic,
            'currency_id'             => $this->currency_id,
            'initial_balance'         => $this->initial_balance,
            'current_balance'         => $this->current_balance,
            'is_default'              => $this->is_default,
            'active'                  => $this->active,
            'is_active'               => $this->active,
            'type'                    => $this->treasuryAccountType?->name,
            'notes'                   => $this->notes,
            'created_by'              => $this->created_by,
            'updated_by'              => $this->updated_by,
            'created_at'              => $this->created_at,
            'updated_at'              => $this->updated_at,
            'deleted_at'              => $this->deleted_at,

            // Relations (تم تصحيح اسم العلاقة)
            'treasury_account_type'   => new TreasuryAccountTypeResource($this->whenLoaded('treasuryAccountType')),
            'currency'                => new CurrencyResource($this->whenLoaded('currency')),
        ];
    }
}