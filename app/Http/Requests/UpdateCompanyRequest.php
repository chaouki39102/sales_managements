<?php
// app/Http/Requests/UpdateCompanyRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->route('company');

        return [
            'name'            => 'sometimes|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string|max:500',
            'tax_number'      => 'nullable|string|max:50',
            'nif'             => 'nullable|string|max:50|unique:companies,nif,' . $companyId,
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'is_active'       => 'nullable|boolean',
        ];
    }
}
