<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateEmploymentContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'sometimes|exists:employees,id',
            'contract_type' => 'sometimes|string|max:50',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'nullable|numeric|min:0',
            'job_title' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'active' => 'nullable|boolean',
        ];
    }
}