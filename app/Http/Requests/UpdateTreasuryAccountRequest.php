<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code,' . $this->route('treasury_account'),
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}