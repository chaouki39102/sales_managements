<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->getCompanyId();

        return [
            'name'      => 'required|string|max:255',
            'username'  => 'nullable|string|max:50|unique:users,username',
            'email'     => ['required', 'email', 'max:255',
                            Rule::unique('users', 'email')->where('company_id', $companyId)],
            'password'  => 'required|string|min:8|max:100',
            'phone'     => 'nullable|string|max:20',
            'avatar'    => 'nullable|string',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'job_title' => 'nullable|string|max:100',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'national_id'=> 'nullable|string|max:20',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'role'      => 'nullable|string|exists:roles,name',
            'active'    => 'boolean',
        ];
    }

    private function getCompanyId(): int
    {
        return $this->user()?->current_company_id
            ?? app(\App\Services\CompanyContextService::class)->get();
    }
}
