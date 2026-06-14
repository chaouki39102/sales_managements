<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer',
            'user_type' => 'nullable|string|max:150',
            'event' => 'required|string|max:50',
            'auditable_type' => 'nullable|string|max:150',
            'auditable_id' => 'nullable|integer',
            'old_values' => 'nullable|array',
            'new_values' => 'nullable|array',
            'url' => 'nullable|string|max:500',
            'ip_address' => 'nullable|string|max:45',
            'user_agent' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ];
    }
}

class UpdateAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer',
            'user_type' => 'nullable|string|max:150',
            'event' => 'sometimes|string|max:50',
            'auditable_type' => 'nullable|string|max:150',
            'auditable_id' => 'nullable|integer',
            'old_values' => 'nullable|array',
            'new_values' => 'nullable|array',
            'url' => 'nullable|string|max:500',
            'ip_address' => 'nullable|string|max:45',
            'user_agent' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ];
    }
}