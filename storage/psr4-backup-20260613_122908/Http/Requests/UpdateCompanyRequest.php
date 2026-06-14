<?php
// app/Http/Requests/UpdateCompanyRequest.php

namespace App\Http\Requests;

use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // نحصل على الـ company إما من route parameter (slug) أو من الـ id الممرر
        $company = $this->route('company');

        // إذا كان $company كائن Company (route model binding) نأخذ id
        // وإلا نبحث عن الشركة باستخدام slug من الرابط
        if ($company instanceof Company) {
            $companyId = $company->id;
        } else {
            // في حالة استخدام slug كمعامل (الوضع الحالي في routes)
            $slug = $this->route('company') ?? $this->route('id');
            $company = Company::where('slug', $slug)->first();
            $companyId = $company?->id;
        }

        $rules = [
            'name'            => 'sometimes|string|max:150',
            'commercial_name' => 'nullable|string|max:150',
            'activity'        => 'nullable|string|max:500',
            'email'           => ['nullable', 'email', 'max:100', Rule::unique('companies')->ignore($companyId)],
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'fax'             => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',
            'nif'             => ['nullable', 'string', 'max:50', Rule::unique('companies')->ignore($companyId)],
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'rc_date'         => 'nullable|date',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'capital_amount'  => 'nullable|numeric|min:0',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'bank_name'       => 'nullable|string|max:100',
            'rib'             => 'nullable|string|max:30',
        ];

        // صلاحيات السوبر أدمن فقط
        if (auth()->user()?->hasRole('super-admin')) {
            $rules['plan']           = ['nullable', 'string', Rule::in(['free', 'starter', 'professional', 'enterprise'])];
            $rules['max_users']      = 'nullable|integer|min:1';
            $rules['max_warehouses'] = 'nullable|integer|min:1';
            $rules['max_products']   = 'nullable|integer|min:1';
            $rules['notes']          = 'nullable|string|max:2000';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'هذا البريد الإلكتروني مستخدم من قبل شركة أخرى',
            'nif.unique'   => 'رقم NIF مستخدم من قبل شركة أخرى',
            'plan.in'      => 'الخطة غير صحيحة',
        ];
    }
}
