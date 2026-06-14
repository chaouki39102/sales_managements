<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:expense_categories,code',
            'description' => 'nullable|string|max:500',
            'parent_id' => 'nullable|exists:expense_categories,id',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

