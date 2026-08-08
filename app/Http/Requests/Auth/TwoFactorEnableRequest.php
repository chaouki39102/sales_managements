<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class TwoFactorEnableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|digits:6',
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'رمز التحقق مطلوب',
            'code.string'   => 'رمز التحقق يجب أن يكون نصاً',
            'code.digits'   => 'رمز التحقق يجب أن يكون 6 أرقام',
        ];
    }
}
