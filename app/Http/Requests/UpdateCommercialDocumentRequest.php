<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ كل الحقول sometimes/nullable — التحديث جزئي (PATCH-style)
 * ✅ lines.*.product_id و quantity و unit_price_ht كلها required
 *    فقط إذا أُرسلت lines (الـ Service يتولى الباقي)
 * ✅ document_number لا يُسمح بتغييره بعد الإنشاء
 *    (يتحقق منه beforeUpdate في الـ Service)
 * ══════════════════════════════════════════════════════════════════
 */
class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        return [
            // ── بيانات الوثيقة ────────────────────────────────────────
            'document_type_id'    => 'sometimes|integer|exists:document_types,id',
            'party_id'            => 'sometimes|nullable|integer|exists:parties,id',
            'warehouse_id'        => 'sometimes|nullable|integer|exists:warehouses,id',
            'currency_id'         => 'sometimes|nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'sometimes|nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'sometimes|nullable|integer|exists:numbering_series,id',
            'exchange_rate'       => 'sometimes|nullable|numeric|min:0.0001',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'sometimes|nullable|date',
            'issued_at'      => 'sometimes|nullable|date',
            'due_date'       => 'sometimes|nullable|date',
            'delivery_date'  => 'sometimes|nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'           => 'sometimes|nullable|string|max:2000',
            'internal_notes'  => 'sometimes|nullable|string|max:2000',
            'payment_terms'   => 'sometimes|nullable|array',
            'shipping_info'   => 'sometimes|nullable|array',
            'legal_mentions'  => 'sometimes|nullable|array',
            'is_proforma'     => 'sometimes|nullable|boolean',

            // ── الأسطر (اختياري في التحديث) ──────────────────────────
            'lines'                            => 'sometimes|array|min:1',

            // ✅ required_with:lines — الحقول إلزامية فقط إذا أُرسلت lines
            'lines.*.product_id'               => 'required_with:lines|integer|exists:products,id',
            'lines.*.quantity'                 => 'required_with:lines|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required_with:lines|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.line_attributes'          => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'lines.min'                        => 'إذا أُرسلت الأسطر، يجب أن يكون هناك سطر واحد على الأقل.',
            'lines.*.product_id.required_with' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required_with'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.unit_price_ht.required_with' => 'يجب تحديد السعر لكل سطر.',
        ];
    }
}
