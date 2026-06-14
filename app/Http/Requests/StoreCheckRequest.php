<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_number' => 'required|string|max:50',
            'check_date' => 'required|date',
            'due_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'drawer_name' => 'nullable|string|max:150',
            'party_id' => 'nullable|exists:parties,id',
            'status' => 'nullable|string|in:pending,cleared,bounced',
            'notes' => 'nullable|string|max:500',
            'metadata' => 'nullable|array',
        ];
    }
}

