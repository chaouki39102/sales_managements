<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // رقم الدفعة — يولَّد تلقائياً إذا لم يُرسَل
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->where('company_id', $companyId)],
            'payment_date'        => 'required|date',
            'amount'              => 'required|numeric|min:0.0001',

            // العملة — اختياري، افتراضي DZD
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',

            // طريقة الدفع والحساب
            'payment_mode_id'     => 'required|integer|exists:payment_modes,id',
            'treasury_account_id' => 'required|integer|exists:treasury_accounts,id',

            // الشيك المرتبط — مطلوب فقط إذا كانت طريقة الدفع شيك
            'check_id'            => 'nullable|integer|exists:checks,id',

            // الطرف (زبون أو مورد)
            'party_id'            => 'nullable|integer|exists:parties,id',

            // السنة المالية
            'fiscal_year_id'      => 'required|integer|exists:fiscal_years,id',

            // مرجع ومعلومات إضافية
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',

            // اتجاه الدفعة (in = مقبوض / out = مدفوع)
            'direction'           => ['nullable', 'string', Rule::in(['in', 'out'])],

            // الحالة
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],

            // ربط الدفعة بمستندات تجارية (جدول document_payment pivot)
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required'        => 'تاريخ الدفعة مطلوب',
            'amount.required'              => 'مبلغ الدفعة مطلوب',
            'amount.min'                   => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_mode_id.required'     => 'طريقة الدفع مطلوبة',
            'treasury_account_id.required' => 'الحساب المالي مطلوب',
            'fiscal_year_id.required'      => 'السنة المالية مطلوبة',
            'payment_number.unique'        => 'رقم الدفعة مستخدم بالفعل',
            'status.in'                    => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
            'direction.in'                 => 'الاتجاه يجب أن يكون: in (مقبوض) أو out (مدفوع)',
        ];
    }
}


