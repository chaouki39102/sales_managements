<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('variant'));
    }

    public function rules(): array
    {
        $variantId = $this->route('variant')->id;

        return [
            'sku' => 'nullable|string|max:100|unique:product_variants,sku,' . $variantId,
            'barcode' => 'nullable|string|max:50',
            'price_type' => 'nullable|in:fixed,percentage',
            'price_value' => 'nullable|numeric|min:0',
            'stock' => 'nullable|numeric|min:0',
            'track_stock' => 'nullable|boolean',
            'attributes' => 'nullable|array',
            'image' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'active' => 'nullable|boolean',
        ];
    }
}
