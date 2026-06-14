<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'required|numeric|min:0',
            'opening_value' => 'required|numeric|min:0',
        ];
    }
}

