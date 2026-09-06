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

            // ── الأسطر (اختياري في التحديث) ──────────────────────────
            'lines'                            => 'sometimes|array|min:1',

            // ✅ required_with:lines — الحقول إلزامية فقط إذا أُرسلت lines
            'lines.*.product_id'               => 'required_with:lines|integer|exists:products,id',
            'lines.*.quantity'                 => ['required_with:lines', 'numeric', 'min:0.0001', function ($attr, $value, $fail) use ($request) {
                $index       = (int) explode('.', $attr)[1];
                $packagingId = $request->input("lines.$index.packaging_id");
                $product     = \App\Models\Product::find($request->input("lines.$index.product_id"));

                if ($product && !($product->is_sold_by_weight ?? false) && !$packagingId) {
                    if (abs(round($value) - $value) > 0.0001) {
                        $fail("لا يمكن بيع كمية كسرية من وحدة أساسية: {$product->name}");
                    }
                }
            }],
            'lines.*.unit_price_ht'            => 'required_with:lines|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.discount_amount_per_unit' => 'nullable|numeric|min:0',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            // pack contract: packaging_id يتطلب معامل تعبئة موجب — pack_qty (عقد الوحدات) أو packaging_units_snapshot (مسار النسخ)
            'lines.*.packaging_id'             => ['nullable', 'integer', 'exists:product_packagings,id', function ($attr, $value, $fail) use ($request) {
                if (! $value) {
                    return;
                }
                $index    = (int) explode('.', $attr)[1];
                $packQty  = $request->input("lines.$index.pack_qty");
                $snapshot = $request->input("lines.$index.packaging_units_snapshot");
                $positive = ($packQty !== null && (float) $packQty > 0)
                    || ($snapshot !== null && (float) $snapshot > 0);
                if (! $positive) {
                    $fail('سطر معبّأ بدون معامل تعبئة (pack_qty أو packaging_units_snapshot) موجب.');
                }
            }],
            'lines.*.pack_qty'                 => 'nullable|numeric|min:0.0001',
            'lines.*.packaging_units_snapshot' => 'nullable|numeric|min:0.0001',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.lot_number'               => 'nullable|string|max:100',
            'lines.*.manufacturing_date'       => 'nullable|date',
            'lines.*.expiration_date'          => 'nullable|date',
            'lines.*.supplier_lot_number'      => 'nullable|string|max:100',
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
            'lines.*.discount_amount_per_unit.min' => 'الخصم الثابت لا يمكن أن يكون سالباً.',
            'lines.*.pack_qty.min'                 => 'معامل التعبئة (pack_qty) يجب أن يكون موجباً.',
            'lines.*.packaging_units_snapshot.min' => 'معامل التعبئة المخزّن يجب أن يكون موجباً.',
        ];
    }
}
