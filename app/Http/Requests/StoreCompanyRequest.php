<?php
// app/Http/Requests/StoreCompanyRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => 'required|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string|max:500',
            'tax_number'      => 'nullable|string|max:50',
            'nif'             => 'nullable|string|max:50|unique:companies,nif',
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'is_active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الشركة مطلوب',
            'nif.unique'    => 'رقم التعريف الجبائي موجود بالفعل',
        ];
    }
}
