<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'required|string|max:150|unique:settings,key',
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'sometimes|string|max:150|unique:settings,key,' . $this->route('setting'),
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}