<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'matricule' => 'nullable|string|max:50|unique:employees,matricule',
            'user_id' => 'nullable|exists:users,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'nss' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'rib' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:50',
        ];
    }
}

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'matricule' => 'sometimes|string|max:50|unique:employees,matricule,' . $this->route('employee'),
            'user_id' => 'nullable|exists:users,id',
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'nss' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'rib' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:50',
        ];
    }
}