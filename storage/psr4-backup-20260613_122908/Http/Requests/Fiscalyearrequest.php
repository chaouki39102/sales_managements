<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'       => ['required', 'string', 'max:50',
                              Rule::unique('fiscal_years', 'name')->where('company_id', $companyId)],
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'اسم السنة المالية مطلوب (مثال: 2025)',
            'name.unique'         => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'start_date.required' => 'تاريخ البداية مطلوب',
            'end_date.required'   => 'تاريخ النهاية مطلوب',
            'end_date.after'      => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}


class UpdateFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('fiscal_year');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'          => ['sometimes', 'string', 'max:50',
                                 Rule::unique('fiscal_years', 'name')->ignore($id)->where('company_id', $companyId)],
            // لا يُسمح بتعديل التواريخ إذا كانت السنة مغلقة — يتحقق Controller
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after:start_date',
            'is_current'    => 'nullable|boolean',
            // closing_notes فقط عند الإغلاق — يُرسَل من FiscalYearController::close()
            'closing_notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique'    => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}
