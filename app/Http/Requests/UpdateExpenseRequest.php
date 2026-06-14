<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('expense');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'expense_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('expenses', 'expense_number')->ignore($id)->where('company_id', $companyId)],
            'date'                => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'expense_category_id' => 'sometimes|integer|exists:expense_categories,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'payment_mode_id'     => 'nullable|integer|exists:payment_modes,id',
            'treasury_account_id' => 'nullable|integer|exists:treasury_accounts,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'description'         => 'nullable|string|max:1000',
            'reference'           => 'nullable|string|max:100',
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'is_paid'             => 'nullable|boolean',
            'is_recurring'        => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'            => 'المبلغ يجب أن يكون أكبر من الصفر',
            'expense_number.unique' => 'رقم المصروف مستخدم بالفعل',
            'status.in'             => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}
