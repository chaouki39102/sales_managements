<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug',
            'description' => 'nullable|string',
            'family_id' => 'nullable|integer|exists:families,id',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'nullable|integer|exists:product_types,id',
            'specifications' => 'nullable|array',
            'images' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|array',
            'active' => 'nullable|boolean',
        ];
    }
}

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product');

        return [
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:products,slug,' . $productId,
            'description' => 'nullable|string',
            'family_id' => 'nullable|integer|exists:families,id',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'nullable|integer|exists:product_types,id',
            'specifications' => 'nullable|array',
            'images' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|array',
            'active' => 'nullable|boolean',
        ];
    }
}
