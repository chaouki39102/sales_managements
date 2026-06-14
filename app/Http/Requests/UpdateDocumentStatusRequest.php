<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:50|unique:document_statuses,name,' . $this->route('document_status'),
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
        ];
    }
}