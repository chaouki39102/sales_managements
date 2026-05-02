<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = \App\Models\Product::find($this->product_id);
        return $product && $this->user()->can('create', [\App\Models\ProductVariant::class, $product]);
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:50|unique:barcodes,barcode', // سنتحقق من uniqueness مع الشركة لاحقاً
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
