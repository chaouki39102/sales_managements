<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreAttachmentRequest
 *
 * المرفقات polymorphic — تُرفق لأي كيان (commercial_documents, parties, expenses...).
 * الـ attachable_type و attachable_id يُحددان الكيان المرتبط.
 *
 * خريطة الـ attachable_type المقبولة:
 *   commercial_document → App\Models\CommercialDocument
 *   party               → App\Models\Party
 *   expense             → App\Models\Expense
 *   product             → App\Models\Product
 *   employee            → App\Models\Employee
 *   payment             → App\Models\Payment
 */

class UpdateAttachmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // عند التحديث — فقط البيانات الوصفية قابلة للتعديل
            // الملف نفسه لا يتغير (يُحذف القديم وينشأ جديد)
            'title'       => 'sometimes|nullable|string|max:200',
            'description' => 'sometimes|nullable|string|max:1000',
            'category'    => 'sometimes|nullable|string|max:50',
            'is_public'   => 'sometimes|nullable|boolean',
        ];
    }
}
