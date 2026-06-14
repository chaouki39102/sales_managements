<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
        ];
    }
}
