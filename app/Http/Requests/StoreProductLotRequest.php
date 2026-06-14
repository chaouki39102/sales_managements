<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['required', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}


