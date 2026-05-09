<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'company_id'            => $this->company_id,
            'expense_number'        => $this->expense_number,
            'date'                  => $this->date,
            'amount'                => $this->amount,
            'expense_category_id'   => $this->expense_category_id,
            'fiscal_year_id'        => $this->fiscal_year_id,
            'payment_mode_id'       => $this->payment_mode_id,
            'treasury_account_id'   => $this->treasury_account_id,
            'party_id'              => $this->party_id,
            'description'           => $this->description,
            'reference'             => $this->reference,
            'has_attachments'       => $this->has_attachments,
            'status'                => $this->status,
            'is_paid'               => $this->is_paid,
            'is_recurring'          => $this->is_recurring,
            'created_by'            => $this->created_by,
            'updated_by'            => $this->updated_by,
            'created_at'            => $this->created_at,
            'updated_at'            => $this->updated_at,
            'deleted_at'            => $this->deleted_at,

            // Relations
            'expense_category'      => new ExpenseCategoryResource($this->whenLoaded('expenseCategory')),
            'fiscal_year'           => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'payment_mode'          => new PaymentModeResource($this->whenLoaded('paymentMode')),
            'treasury_account'      => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
            'party'                 => new PartyResource($this->whenLoaded('party')),
        ];
    }
}
