<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $barcode = \App\Models\Barcode::find($this->route('barcode'));
        if (!$barcode) {
            return false;
        }
        return $this->user()->can('update', $barcode);
    }

    public function rules(): array
    {
        $barcodeId = $this->route('barcode');

        return [
            'barcode' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('barcodes', 'barcode')->where(function ($query) {
                    $query->where('company_id', $this->user()->current_company_id);
                })->ignore($barcodeId),
            ],
            'type'      => 'sometimes|string|max:50',
            'is_primary' => 'sometimes|boolean',
            'unit'      => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'barcode.unique' => 'هذا الباركود مسجل مسبقاً ضمن شركتك.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (!$this->user()->current_company_id) {
            $companyId = app(\App\Services\CompanyContextService::class)->get();
            $this->user()->current_company_id = $companyId;
        }
    }
}
