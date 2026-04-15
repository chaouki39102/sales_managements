<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'code' => $this->code, 'treasury_account_type_id' => $this->treasury_account_type_id,
            'bank_name' => $this->bank_name, 'account_number' => $this->account_number, 'rib' => $this->rib, 'iban' => $this->iban,
            'swift_bic' => $this->swift_bic, 'currency' => $this->currency, 'initial_balance' => $this->initial_balance,
            'current_balance' => $this->current_balance, 'is_default' => $this->is_default, 'active' => $this->active,
            'notes' => $this->notes, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_bank_account' => $this->is_bank_account, 'is_cash_account' => $this->is_cash_account,
            'relations' => ['treasuryAccountType' => $this->whenLoaded('treasuryAccountType', fn() => ['id' => $this->treasuryAccountType->id, 'name' => $this->treasuryAccountType->name])],
        ];
    }
}