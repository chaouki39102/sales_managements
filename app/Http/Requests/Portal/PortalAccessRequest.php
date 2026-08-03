<?php

namespace App\Http\Requests\Portal;

use App\Services\CompanyContextService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PortalAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = app(CompanyContextService::class)->get();
        $portalId  = $this->route('portal') ?? $this->route('id');

        return [
            'party_id' => ['required', 'integer', 'exists:parties,id'],
            'name'     => ['nullable', 'string', 'max:191'],
            'email'    => [
                'required',
                'string',
                'email',
                'max:191',
                Rule::unique('portal_users', 'email')->where(fn ($q) => $q->where('company_id', $companyId))->ignore($portalId),
            ],
            'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'party_id.required' => 'الزبون مطلوب',
            'party_id.exists'   => 'الزبون غير موجود',
            'email.required'    => 'البريد الإلكتروني مطلوب',
            'email.email'       => 'البريد الإلكتروني غير صحيح',
            'email.unique'      => 'يوجد بالفعل حساب بوابة بهذا البريد الإلكتروني لهذه المؤسسة',
            'password.required' => 'كلمة المرور مطلوبة',
            'password.min'      => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
        ];
    }
}
