<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:50|unique:document_statuses,name',
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
        ];
    }
}

