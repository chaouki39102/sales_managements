<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'party_id' => 'required|exists:parties,id',
            'opening_balance' => 'required|numeric',
            'balance_type' => 'required|in:debit,credit',
        ];
    }
}

class UpdateOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'party_id' => 'sometimes|exists:parties,id',
            'opening_balance' => 'sometimes|numeric',
            'balance_type' => 'sometimes|in:debit,credit',
        ];
    }
}