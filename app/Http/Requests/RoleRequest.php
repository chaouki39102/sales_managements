<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:roles,name',
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ];
    }
}

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $this->route('role'),
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ];
    }
}