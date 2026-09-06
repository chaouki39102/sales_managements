<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ party_id: nullable دائماً — يُعيَّن "Client Cash" تلقائياً في Service
 *    إذا لم يُرسل party_id مع نوع وثيقة يتطلب طرف.
 *
 * ✅ lines.*.packaging_id: nullable لأن migration أضافها لاحقاً
 *    ويجب أن يكون الـ Service هو من يتجاهلها لا الـ Request.
 *
 * ✅ fiscal_year_id: nullable — يعيّنه الـ Service تلقائياً
 *    من السنة المالية الحالية للشركة.
 *
 * ✅ currency_id: nullable — يُستخدم DZD (id=1) افتراضياً.
 * ══════════════════════════════════════════════════════════════════
 */
class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        return [
            // ── بيانات الوثيقة الأساسية ──────────────────────────────
            'document_type_id'    => 'required|integer|exists:document_types,id',

            // ✅ party_id: nullable دائماً — إذا لم يُرسل، يُعيَّن "Client Cash" تلقائياً في Service
            'party_id'            => 'nullable|integer|exists:parties,id',

            'warehouse_id'        => 'nullable|integer|exists:warehouses,id',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'nullable|integer|exists:numbering_series,id',
            'document_number'     => 'nullable|string|max:50',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'nullable|date',
            'issued_at'      => 'nullable|date',
            'due_date'       => 'nullable|date|after_or_equal:document_date',
            'delivery_date'  => 'nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'          => 'nullable|string|max:2000',
            'internal_notes' => 'nullable|string|max:2000',
            'payment_terms'  => 'nullable|array',
            'shipping_info'  => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'exchange_rate'               => 'nullable|numeric|min:0.0001',
            'source_document_id'          => 'nullable|integer',
            'cancellation_of_document_id' => 'nullable|integer',
            'cancellation_reason'         => 'nullable|string|max:500',

            // ── الأسطر ───────────────────────────────────────────────
            'lines'                            => 'required|array|min:1',
            'lines.*.product_id'               => 'required|integer|exists:products,id',
            'lines.*.quantity'                 => ['required', 'numeric', 'min:0.0001', function ($attr, $value, $fail) use ($request) {
                $index       = (int) explode('.', $attr)[1];
                $packagingId = $request->input("lines.$index.packaging_id");
                $product     = \App\Models\Product::find($request->input("lines.$index.product_id"));

                if ($product && !($product->is_sold_by_weight ?? false) && !$packagingId) {
                    if (abs(round($value) - $value) > 0.0001) {
                        $fail("لا يمكن بيع كمية كسرية من وحدة أساسية: {$product->name}");
                    }
                }
            }],
            'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.discount_amount'          => 'nullable|numeric|min:0',
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
            'lines.*.notes'                    => 'nullable|string|max:500',
            'lines.*.line_attributes'          => 'nullable|array',

            // ── الدفعات (free mode) ──────────────────────────────────
            'payments'                           => 'nullable|array',
            'payments.*.payment_mode_id'         => 'required_with:payments|integer',
            'payments.*.amount'                  => 'required_with:payments|numeric|min:0.01',
            'payments.*.payment_date'            => 'required_with:payments|date',
            'payments.*.reference'               => 'nullable|string|max:255',
            'payments.*.treasury_account_id'     => 'nullable|integer',
            'payments.*.check_number'            => 'nullable|string|max:100',
            'payments.*.check_bank'              => 'nullable|string|max:200',
            'payments.*.check_due_date'          => 'nullable|date',

            // ── الدفعات الإضافية (additive mode) ─────────────────────
            'new_payments'                           => 'nullable|array',
            'new_payments.*.payment_mode_id'         => 'required_with:new_payments|integer',
            'new_payments.*.amount'                  => 'required_with:new_payments|numeric|min:0.01',
            'new_payments.*.payment_date'            => 'required_with:new_payments|date',
            'new_payments.*.reference'               => 'nullable|string|max:255',
            'new_payments.*.treasury_account_id'     => 'nullable|integer',
            'new_payments.*.check_number'            => 'nullable|string|max:100',
            'new_payments.*.check_bank'              => 'nullable|string|max:200',
            'new_payments.*.check_due_date'          => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'document_type_id.required'   => 'يجب تحديد نوع الوثيقة.',
            'lines.required'              => 'يجب إضافة سطر واحد على الأقل.',
            'lines.min'                   => 'يجب إضافة سطر واحد على الأقل.',
            'lines.*.product_id.required' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.quantity.min'        => 'يجب أن تكون الكمية أكبر من الصفر.',
            'lines.*.unit_price_ht.required' => 'يجب تحديد السعر لكل سطر.',
            'lines.*.unit_price_ht.min'   => 'يجب أن يكون السعر غير سلبي.',
            'lines.*.discount_amount_per_unit.min' => 'الخصم الثابت لا يمكن أن يكون سالباً.',
            'lines.*.pack_qty.min'                 => 'معامل التعبئة (pack_qty) يجب أن يكون موجباً.',
            'lines.*.packaging_units_snapshot.min' => 'معامل التعبئة المخزّن يجب أن يكون موجباً.',
            'due_date.after_or_equal'     => 'يجب أن يكون تاريخ الاستحقاق بعد أو مساوياً لتاريخ الوثيقة.',
        ];
    }
}
