<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreEmploymentContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'required|exists:employees,id',
            'contract_type' => 'required|string|max:50',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'nullable|numeric|min:0',
            'job_title' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'active' => 'nullable|boolean',
        ];
    }
}

