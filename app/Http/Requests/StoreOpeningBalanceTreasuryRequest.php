<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOpeningBalanceTreasuryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id'      => 'required|exists:fiscal_years,id',
            'treasury_account_id' => [
                'required',
                'exists:treasury_accounts,id',
                Rule::unique('opening_balances_treasury')
                    ->where('fiscal_year_id', $this->input('fiscal_year_id')),
            ],
            'opening_balance'     => 'required|numeric',
        ];
    }

    public function messages(): array
    {
        return [
            'treasury_account_id.unique' => 'هذا الحساب لديه رصيد افتتاحي بالفعل لهذه السنة',
        ];
    }
}
