<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'product_id' => 'sometimes|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'sometimes|numeric|min:0',
            'opening_value' => 'sometimes|numeric|min:0',
        ];
    }
}
