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

            // ✅ تصحيح: casts('decimal:4') على الموديل يجعل Laravel يُخرج
            // القيمة كنص في JSON (مثلاً "1200.0000") للحفاظ على الدقة داخلياً.
            // هذا كان يُسبب انهيار/دمج نصوص في الواجهة (خصوصاً عند إعادة فتح
            // فاتورة محفوظة) لأن الفرونت يفترض دائماً رقماً. الحل الصحيح:
            // الدقة الداخلية تبقى decimal في PHP، لكن حدود الـAPI ترجع float
            // دائماً — عقد واضح وموحّد لكل مستهلكي هذا الـResource.
            'amount'              => (float) $this->amount,
            'currency_id'         => $this->currency_id,
            'amount_local'        => $this->amount_local !== null ? (float) $this->amount_local : null,

            'payment_mode_id'     => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'check_id'            => $this->check_id,
            'party_id'            => $this->party_id,
            'fiscal_year_id'      => $this->fiscal_year_id,
            'client_ref'          => $this->client_ref,
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
