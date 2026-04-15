<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductVariantPriceRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_variant_id' => 'required|exists:product_variants,id', 'price_level_id' => 'required|exists:price_levels,id',
            'price' => 'required|numeric|min:0', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
            'active' => 'nullable|boolean',
        ];
    }
}

class UpdateProductVariantPriceRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_variant_id' => 'sometimes|exists:product_variants,id', 'price_level_id' => 'sometimes|exists:price_levels,id',
            'price' => 'sometimes|numeric|min:0', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
            'active' => 'nullable|boolean',
        ];
    }
}