<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuantityDiscountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_variant_id' => 'required|exists:product_variants,id', 'min_quantity' => 'required|numeric|min:0',
            'max_quantity' => 'nullable|numeric|min:0|gte:min_quantity', 'discount_per_unit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100', 'tier_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
        ];
    }
}

class UpdateQuantityDiscountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_variant_id' => 'sometimes|exists:product_variants,id', 'min_quantity' => 'sometimes|numeric|min:0',
            'max_quantity' => 'nullable|numeric|min:0|gte:min_quantity', 'discount_per_unit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100', 'tier_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
        ];
    }
}