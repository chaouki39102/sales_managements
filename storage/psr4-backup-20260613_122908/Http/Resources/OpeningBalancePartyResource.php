<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalancePartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'fiscal_year_id'  => $this->fiscal_year_id,
            'fiscal_year'     => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'party_id'        => $this->party_id,
            'party'           => new PartyResource($this->whenLoaded('party')),
            'opening_balance' => $this->opening_balance,
            'balance_type'    => $this->balance_type, // debit | credit
            'created_at'      => $this->created_at?->toDateTimeString(),
            'updated_at'      => $this->updated_at?->toDateTimeString(),
        ];
    }
}
