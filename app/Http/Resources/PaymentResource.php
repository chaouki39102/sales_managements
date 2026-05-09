<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'payment_number'      => $this->payment_number,
            'payment_date'        => $this->payment_date,
            'amount'              => $this->amount,
            'currency_id'         => $this->currency_id,
            'amount_local'        => $this->amount_local,
            'payment_mode_id'     => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'check_id'            => $this->check_id,
            'party_id'            => $this->party_id,
            'fiscal_year_id'      => $this->fiscal_year_id,
            'reference'           => $this->reference,
            'bank_reference'      => $this->bank_reference,
            'notes'               => $this->notes,
            'status'              => $this->status,
            'is_reconciled'       => $this->is_reconciled,
            'reconciliation_date' => $this->reconciliation_date,
            'clearing_date'       => $this->clearing_date,
            'user_id'             => $this->user_id,
            'created_by'          => $this->created_by,
            'updated_by'          => $this->updated_by,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'party'               => new PartyResource($this->whenLoaded('party')),
            'payment_mode'        => new PaymentModeResource($this->whenLoaded('paymentMode')),
            'treasury_account'    => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
            'currency'            => new CurrencyResource($this->whenLoaded('currency')),
            'check'               => new CheckResource($this->whenLoaded('check')),
            'fiscal_year'         => new FiscalYearResource($this->whenLoaded('fiscalYear')),
        ];
    }
}
