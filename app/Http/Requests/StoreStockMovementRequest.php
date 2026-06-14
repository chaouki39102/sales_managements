<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreStockMovementRequest
 *
 * حركات المخزون في الغالب تُنشأ تلقائياً من المستندات التجارية،
 * لكن يمكن إنشاؤها يدوياً (جرد، تسوية، نقل...).
 *
 * الكميات دائماً بالوحدة الأساسية — التحويل يتم في الـ Service.
 */

class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'product_id'              => 'required|integer|exists:products,id',
            'warehouse_id'            => 'required|integer|exists:warehouses,id',
            'stock_movement_type_id'  => 'required|integer|exists:stock_movement_types,id',
            'fiscal_year_id'          => 'required|integer|exists:fiscal_years,id',

            // وحدة التعبئة المستخدمة (اختياري — UN افتراضي)
            'packaging_id'            => 'nullable|integer|exists:product_packagings,id',

            'movement_date'           => 'required|date',

            // الكمية بالوحدة الأساسية
            'quantity'                => 'required|numeric|min:0.0001',
            // الكمية بوحدة التعبئة — للعرض فقط
            'packaging_quantity'      => 'nullable|numeric|min:0',

            // الأسعار
            'unit_price'              => 'required|numeric|min:0',
            'cost_price'              => 'nullable|numeric|min:0',

            // مصدر السعر
            'price_source'            => ['nullable', 'string', Rule::in(['purchase', 'sale', 'adjustment'])],

            // ربط بمستند تجاري (يُضبط تلقائياً من CommercialDocumentService)
            'commercial_document_line_id' => 'nullable|integer|exists:commercial_document_lines,id',

            // تتبع الدفعات (Lots)
            'lot_number'              => 'nullable|string|max:100',
            'expiration_date'         => 'nullable|date',
            'stock_lot_id'            => 'nullable|integer|exists:product_lots,id',

            'reason'                  => 'nullable|string|max:255',
            'notes'                   => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required'             => 'المنتج مطلوب',
            'warehouse_id.required'           => 'المستودع مطلوب',
            'stock_movement_type_id.required' => 'نوع الحركة مطلوب',
            'fiscal_year_id.required'         => 'السنة المالية مطلوبة',
            'movement_date.required'          => 'تاريخ الحركة مطلوب',
            'quantity.required'               => 'الكمية مطلوبة',
            'quantity.min'                    => 'الكمية يجب أن تكون أكبر من الصفر',
            'unit_price.required'             => 'سعر الوحدة مطلوب',
            'price_source.in'                 => 'مصدر السعر يجب أن يكون: purchase أو sale أو adjustment',
        ];
    }
}


