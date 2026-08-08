<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class TwoFactorConfirmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'challenge_token' => 'required|string',
            'code'            => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'challenge_token.required' => 'رمز التحدي مطلوب',
            'challenge_token.string'   => 'رمز التحدي غير صالح',
            'code.required'            => 'رمز التحقق مطلوب',
            'code.string'              => 'رمز التحقق غير صالح',
        ];
    }
}
