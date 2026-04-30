<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'required|integer|exists:document_types,id',
            'party_id' => 'required|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:document_date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'is_proforma' => 'nullable|boolean',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer|exists:products,id',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.unit_price_ht' => 'required|numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
            'lines.*.description' => 'nullable|string',
        ];
    }
}

class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $documentId = $this->route('commercial_document');

        return [
            'document_type_id' => 'sometimes|integer|exists:document_types,id',
            'party_id' => 'sometimes|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'lines' => 'sometimes|array|min:1',
            'lines.*.product_id' => 'integer|exists:products,id',
            'lines.*.quantity' => 'numeric|min:0.001',
            'lines.*.unit_price_ht' => 'numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
        ];
    }
}
