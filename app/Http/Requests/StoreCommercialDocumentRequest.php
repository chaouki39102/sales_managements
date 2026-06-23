<?php

namespace App\Http\Requests;

use App\Models\DocumentType;
use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ party_id: required/nullable يُحدَّد ديناميكياً حسب نوع الوثيقة.
 *    - Bon de transfert (BT): requires_party = false → nullable
 *    - باقي الأنواع: requires_party = true → required
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
        // تحديد إذا كان نوع الوثيقة يتطلب طرفاً (زبون/مورد)
        $partyRequired = $this->resolvePartyRequired();

        return [
            // ── بيانات الوثيقة الأساسية ──────────────────────────────
            'document_type_id'    => 'required|integer|exists:document_types,id',

            // ✅ party_id: required أو nullable حسب نوع الوثيقة
            'party_id'            => $partyRequired
                                        ? 'required|integer|exists:parties,id'
                                        : 'nullable|integer|exists:parties,id',

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
            'lines.*.quantity'                 => 'required|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.discount_amount'          => 'nullable|numeric|min:0',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.lot_number'               => 'nullable|string|max:100',
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
            'party_id.required'           => 'يجب تحديد الزبون أو المورد لهذا النوع من الوثائق.',
            'lines.required'              => 'يجب إضافة سطر واحد على الأقل.',
            'lines.min'                   => 'يجب إضافة سطر واحد على الأقل.',
            'lines.*.product_id.required' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.quantity.min'        => 'يجب أن تكون الكمية أكبر من الصفر.',
            'lines.*.unit_price_ht.required' => 'يجب تحديد السعر لكل سطر.',
            'lines.*.unit_price_ht.min'   => 'يجب أن يكون السعر غير سلبي.',
            'due_date.after_or_equal'     => 'يجب أن يكون تاريخ الاستحقاق بعد أو مساوياً لتاريخ الوثيقة.',
        ];
    }

    /**
     * تحديد إذا كان party_id إلزامياً حسب نوع الوثيقة.
     *
     * ✅ نجلب DocumentType مرة واحدة ونخزّنها في الـ instance
     * ✅ إذا لم نتمكن من تحديد النوع، نعتبره إلزامياً (الأكثر أماناً)
     */
    private function resolvePartyRequired(): bool
    {
        $documentTypeId = $this->input('document_type_id');

        if (!$documentTypeId) {
            return true; // إلزامي افتراضياً — validation ستفشل على document_type_id
        }

        $documentType = DocumentType::find($documentTypeId);

        // إذا لم يُعثر على النوع، requires_party = true افتراضياً
        return $documentType?->requires_party ?? true;
    }
}
