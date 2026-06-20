<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StoreOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'party_id' => [
                'required',
                'exists:parties,id',
                Rule::unique('opening_balances_parties')
                    ->where('fiscal_year_id', $this->input('fiscal_year_id')),
            ],
            'opening_balance' => 'required|numeric',
            'balance_type' => 'required|in:debit,credit',
        ];
    }

    public function messages(): array
    {
        return [
            'party_id.unique' => 'هذا المتعامل لديه رصيد افتتاحي بالفعل لهذه السنة',
        ];
    }
}

