<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization في Controller عبر Policy
    }

    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:100|unique:roles,name',
            'display_name'     => 'nullable|string|max:150',
            'description'      => 'nullable|string|max:500',
            'guard_name'       => 'nullable|string|max:50',
            'permission_ids'   => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الدور مطلوب',
            'name.unique'   => 'هذا الدور موجود بالفعل',
        ];
    }
}
