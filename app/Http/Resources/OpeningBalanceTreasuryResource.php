<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalanceTreasuryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'fiscal_year_id'     => $this->fiscal_year_id,
            'fiscal_year'        => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'treasury_account_id'=> $this->treasury_account_id,
            'treasury_account'   => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
            'opening_balance'    => $this->opening_balance,
            'created_at'         => $this->created_at?->toDateTimeString(),
            'updated_at'         => $this->updated_at?->toDateTimeString(),
        ];
    }
}
