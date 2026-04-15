<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name' => 'required|string|max:255',
            'file_path' => 'required|string|max:500',
            'file_type' => 'nullable|string|max:100',
            'file_extension' => 'nullable|string|max:20',
            'file_size' => 'nullable|integer|min:0',
            'attachable_type' => 'nullable|string|max:150',
            'attachable_id' => 'nullable|integer',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'is_public' => 'nullable|boolean',
            'disk' => 'nullable|string|max:50',
            'uploaded_by' => 'nullable|integer|exists:users,id',
        ];
    }
}

class UpdateAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name' => 'sometimes|string|max:255',
            'file_path' => 'sometimes|string|max:500',
            'file_type' => 'nullable|string|max:100',
            'file_extension' => 'nullable|string|max:20',
            'file_size' => 'nullable|integer|min:0',
            'attachable_type' => 'nullable|string|max:150',
            'attachable_id' => 'nullable|integer',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'is_public' => 'nullable|boolean',
            'disk' => 'nullable|string|max:50',
            'uploaded_by' => 'nullable|integer|exists:users,id',
        ];
    }
}