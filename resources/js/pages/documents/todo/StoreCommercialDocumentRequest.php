<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * التغييرات من النسخة السابقة:
 *   + lines.*.discount_amount        — خصم الوحدة الواحدة (للوضع fixed)
 *   + lines.*.notes                  — ملاحظة السطر
 *   + internal_notes                 — ملاحظات داخلية
 *   + delivery_date                  — تاريخ التسليم
 *   + shipping_info                  — بيانات الشحن (JSON)
 *   + is_proforma                    — فاتورة مبدئية
 *   + source_document_id             — مصدر التحويل
 *   + payments.*.check_number        — رقم الشيك
 *   + payments.*.check_bank          — بنك الشيك
 *   + payments.*.check_due_date      — تاريخ استحقاق الشيك
 *   + new_payments                   — دفعات additive mode
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ── المستند الأساسي ───────────────────────────────────────────────
            'document_type_id'             => 'required|integer',
            'party_id'                     => 'nullable|integer',
            'warehouse_id'                 => 'required|integer',
            'fiscal_year_id'               => 'required|integer',
            'currency_id'                  => 'nullable|integer',
            'exchange_rate'                => 'nullable|numeric|min:0',
            'document_date'                => 'required|date',
            'due_date'                     => 'nullable|date',
            'delivery_date'                => 'nullable|date',
            'notes'                        => 'nullable|string|max:2000',
            'internal_notes'               => 'nullable|string|max:2000',
            'is_proforma'                  => 'nullable|boolean',
            'source_document_id'           => 'nullable|integer',
            'cancellation_of_document_id'  => 'nullable|integer',
            'cancellation_reason'          => 'nullable|string|max:500',
            'shipping_info'                => 'nullable|array',
            'shipping_info.address'        => 'nullable|string|max:500',
            'shipping_info.transport_mode' => 'nullable|string|max:100',
            'shipping_info.driver_name'    => 'nullable|string|max:200',
            'shipping_info.vehicle_plate'  => 'nullable|string|max:50',
            'shipping_info.driver_notes'   => 'nullable|string|max:500',

            // ── الأسطر ───────────────────────────────────────────────────────
            'lines'                        => 'nullable|array',
            'lines.*.id'                   => 'nullable|integer',
            'lines.*.product_id'           => 'required_with:lines|integer',
            'lines.*.description'          => 'nullable|string|max:500',
            'lines.*.quantity'             => 'required_with:lines|numeric|min:0.001',
            'lines.*.unit_price_ht'        => 'required_with:lines|numeric|min:0',
            'lines.*.discount_percentage'  => 'nullable|numeric|min:0|max:100',
            // ✅ discount_amount = خصم الوحدة الواحدة (للوضع fixed)
            'lines.*.discount_amount'      => 'nullable|numeric|min:0',
            'lines.*.tva_rate'             => 'required_with:lines|numeric|min:0|max:100',
            'lines.*.packaging_id'         => 'nullable|integer',
            'lines.*.stock_lot_id'         => 'nullable|integer',
            'lines.*.lot_number'           => 'nullable|string|max:100',
            'lines.*.notes'                => 'nullable|string|max:500',

            // ── الدفعات (free mode) ───────────────────────────────────────────
            'payments'                       => 'nullable|array',
            'payments.*.payment_mode_id'     => 'required_with:payments|integer',
            'payments.*.amount'              => 'required_with:payments|numeric|min:0.01',
            'payments.*.payment_date'        => 'required_with:payments|date',
            'payments.*.reference'           => 'nullable|string|max:255',
            'payments.*.treasury_account_id' => 'nullable|integer',
            // ✅ بيانات الشيك
            'payments.*.check_number'        => 'nullable|string|max:100',
            'payments.*.check_bank'          => 'nullable|string|max:200',
            'payments.*.check_due_date'      => 'nullable|date',

            // ── الدفعات الإضافية (additive mode) ─────────────────────────────
            'new_payments'                       => 'nullable|array',
            'new_payments.*.payment_mode_id'     => 'required_with:new_payments|integer',
            'new_payments.*.amount'              => 'required_with:new_payments|numeric|min:0.01',
            'new_payments.*.payment_date'        => 'required_with:new_payments|date',
            'new_payments.*.reference'           => 'nullable|string|max:255',
            'new_payments.*.treasury_account_id' => 'nullable|integer',
            'new_payments.*.check_number'        => 'nullable|string|max:100',
            'new_payments.*.check_bank'          => 'nullable|string|max:200',
            'new_payments.*.check_due_date'      => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'document_type_id.required'         => 'نوع المستند إلزامي',
            'warehouse_id.required'             => 'المستودع إلزامي',
            'fiscal_year_id.required'           => 'السنة المالية إلزامية',
            'document_date.required'            => 'تاريخ المستند إلزامي',
            'lines.*.product_id.required_with'  => 'المنتج إلزامي في كل سطر',
            'lines.*.quantity.required_with'    => 'الكمية إلزامية في كل سطر',
            'lines.*.quantity.min'              => 'الكمية يجب أن تكون أكبر من 0',
            'lines.*.unit_price_ht.required_with' => 'السعر إلزامي في كل سطر',
            'lines.*.tva_rate.required_with'    => 'معدل TVA إلزامي في كل سطر',
            'lines.*.discount_percentage.max'   => 'نسبة الخصم لا يمكن أن تتجاوز 100%',
            'payments.*.amount.min'             => 'مبلغ الدفعة يجب أن يكون أكبر من 0',
        ];
    }
}
