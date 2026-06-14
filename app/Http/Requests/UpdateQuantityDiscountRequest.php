<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateQuantityDiscountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_id' => 'sometimes|exists:products,id', 'min_quantity' => 'sometimes|numeric|min:0',
            'max_quantity' => 'nullable|numeric|min:0|gte:min_quantity', 'discount_per_unit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100', 'tier_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
        ];
    }
}
