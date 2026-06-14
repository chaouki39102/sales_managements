<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255|unique:permissions,name,' . $this->route('permission'),
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'group' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
        ];
    }
}