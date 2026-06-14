<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ✅ استخراج الـ ID بأمان — قد يكون route('role') أو route('id')
        $roleId = $this->route('role') ?? $this->route('id');

        return [
            'display_name'     => 'nullable|string|max:150',
            'description'      => 'nullable|string|max:500',
            'guard_name'       => 'nullable|string|max:50',
            'permission_ids'   => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
            // name اختياري عند التحديث + تجاهل السجل الحالي في unique
            'name'             => "sometimes|string|max:100|unique:roles,name,{$roleId}",
        ];
    }
}
