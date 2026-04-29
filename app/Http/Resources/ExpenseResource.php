<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_number' => $this->expense_number,
            'date' => $this->date?->toIso8601String(),
            'amount' => $this->amount,
            'expense_category_id' => $this->expense_category_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'payment_mode_id' => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'party_id' => $this->party_id,
            'description' => $this->description,
            'reference' => $this->reference,
            'has_attachments' => $this->has_attachments,
            'status' => $this->status,
            'is_paid' => $this->is_paid,
            'is_recurring' => $this->is_recurring,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'expenseCategory' => $this->whenLoaded('expenseCategory', fn() => [
                    'id' => $this->expenseCategory->id,
                    'name' => $this->expenseCategory->name,
                ]),
                'paymentMode' => $this->whenLoaded('paymentMode', fn() => [
                    'id' => $this->paymentMode->id,
                    'name' => $this->paymentMode->name,
                ]),
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                ]),
            ],
        ];
    }
}
