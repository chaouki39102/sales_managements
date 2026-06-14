<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['required', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم المستودع مطلوب',
            'name.unique'   => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique'   => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}


class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('warehouse');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['sometimes', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->ignore($id)->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->ignore($id)->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique' => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}
