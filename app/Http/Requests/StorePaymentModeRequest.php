<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StorePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code',
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

