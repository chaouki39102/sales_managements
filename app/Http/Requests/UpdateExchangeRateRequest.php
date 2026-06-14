<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateExchangeRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_currency_id' => 'sometimes|exists:currencies,id',
            'to_currency_id' => 'sometimes|exists:currencies,id|different:from_currency_id',
            'rate' => 'sometimes|numeric|min:0',
            'rate_date' => 'sometimes|date',
        ];
    }
}