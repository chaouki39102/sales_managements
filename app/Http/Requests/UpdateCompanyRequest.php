<?php
// app/Http/Requests/UpdateCompanyRequest.php

namespace App\Http\Requests;

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
        // الـ route يعتمد slug كـ key (getRouteKeyName = 'slug')
        $company = $this->route('company');
        $companyId = is_object($company) ? $company->id : null;

        $rules = [
            // ── بيانات أساسية ──
            'name'            => 'sometimes|string|max:150',
            'commercial_name' => 'nullable|string|max:150',
            'activity'        => 'nullable|string|max:500',

            // ── تواصل ──
            'email'           => ['nullable', 'email', 'max:100',
                                  Rule::unique('companies', 'email')->ignore($companyId)],
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',

            // ── وثائق قانونية ──
            'nif'             => ['nullable', 'string', 'max:50',
                                  Rule::unique('companies', 'nif')->ignore($companyId)],
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',

            // ── حالة ──
            'active'       => 'nullable|boolean',
        ];

        // ── حقول Super Admin فقط ──────────────────────────────
        if (auth()->user()?->hasRole('super-admin')) {
            $rules = array_merge($rules, [
                'plan'           => ['nullable', 'string', Rule::in(['free', 'starter', 'professional', 'enterprise'])],
                'max_users'      => 'nullable|integer|min:1|max:9999',
                'max_warehouses' => 'nullable|integer|min:1|max:99',
                'max_products'   => 'nullable|integer|min:1|max:999999',
                'notes'          => 'nullable|string|max:2000',
                'trial_ends_at'  => 'nullable|date',
            ]);
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.max'          => 'اسم الشركة يجب ألا يتجاوز 150 حرف',
            'email.unique'      => 'هذا البريد الإلكتروني مستخدم من قبل شركة أخرى',
            'nif.unique'        => 'رقم NIF مستخدم من قبل شركة أخرى',
            'plan.in'           => 'الخطة غير صحيحة، القيم المتاحة: free, starter, professional, enterprise',
            'max_users.min'     => 'يجب أن يكون حد المستخدمين 1 على الأقل',
            'max_products.min'  => 'يجب أن يكون حد المنتجات 1 على الأقل',
        ];
    }
}
