<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = auth()->id();

        return [
            'name'      => 'sometimes|string|max:255',
            'username'  => "nullable|string|max:50|unique:users,username,{$userId}",
            'phone'     => 'nullable|string|max:20',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
        ];
    }
}
