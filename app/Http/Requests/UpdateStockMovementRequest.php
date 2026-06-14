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

class UpdateStockMovementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // حركات المخزون لا تُعدَّل في الغالب — فقط الحقول الوصفية
            'reason'   => 'sometimes|nullable|string|max:255',
            'notes'    => 'sometimes|nullable|string|max:1000',

            // السماح بتعديل السعر في حالة التسويات اليدوية
            'unit_price'  => 'sometimes|numeric|min:0',
            'cost_price'  => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'unit_price.min' => 'سعر الوحدة يجب أن يكون صفراً أو أكثر',
        ];
    }
}
