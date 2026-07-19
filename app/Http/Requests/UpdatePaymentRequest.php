<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return $this->buildRules($this->route('payment'));
    }

    public function rulesWithId(int $id): array
    {
        return $this->buildRules($id);
    }

    private function buildRules($id): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->ignore($id)->where('company_id', $companyId)],
            'payment_date'        => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',
            'payment_mode_id'     => 'sometimes|integer|exists:payment_modes,id',
            'treasury_account_id' => 'sometimes|integer|exists:treasury_accounts,id',
            'check_id'            => 'nullable|integer|exists:checks,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',
            'direction'           => ['nullable', 'string', Rule::in(['in', 'out'])],
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'              => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_number.unique'   => 'رقم الدفعة مستخدم بالفعل',
            'status.in'               => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
            'direction.in'            => 'الاتجاه يجب أن يكون: in (مقبوض) أو out (مدفوع)',
        ];
    }
}
