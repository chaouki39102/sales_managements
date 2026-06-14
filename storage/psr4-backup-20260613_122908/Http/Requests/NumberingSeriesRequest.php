<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNumberingSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'required|exists:document_types,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'prefix' => 'nullable|string|max:20',
            'suffix' => 'nullable|string|max:20',
            'format' => 'required|string|max:50',
            'last_number' => 'nullable|integer|min:0',
            'padding' => 'nullable|integer|min:1|max:10',
            'start_number' => 'nullable|integer|min:1',
            'max_number' => 'nullable|integer|min:1',
            'reset_yearly' => 'nullable|boolean',
            'reset_monthly' => 'nullable|boolean',
            'active' => 'nullable|boolean',
        ];
    }
}

class UpdateNumberingSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'sometimes|exists:document_types,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'prefix' => 'nullable|string|max:20',
            'suffix' => 'nullable|string|max:20',
            'format' => 'sometimes|string|max:50',
            'last_number' => 'nullable|integer|min:0',
            'padding' => 'nullable|integer|min:1|max:10',
            'start_number' => 'nullable|integer|min:1',
            'max_number' => 'nullable|integer|min:1',
            'reset_yearly' => 'nullable|boolean',
            'reset_monthly' => 'nullable|boolean',
            'active' => 'nullable|boolean',
        ];
    }
}