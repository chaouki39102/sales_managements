<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalancePartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'party_id' => $this->party_id,
            'opening_balance' => $this->opening_balance,
            'balance_type' => $this->balance_type,
            'is_debit' => $this->is_debit,
            'is_credit' => $this->is_credit,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'fiscalYear' => $this->whenLoaded('fiscalYear', fn() => [
                    'id' => $this->fiscalYear->id,
                    'name' => $this->fiscalYear->name,
                ]),
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                    'code' => $this->party->code,
                ]),
            ],
        ];
    }
}