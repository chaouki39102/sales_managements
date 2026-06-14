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

class StoreAttachmentRequest extends FormRequest
{
    // الأنواع المدعومة — يقابل كل مفتاح morph alias في AppServiceProvider
    private const ALLOWED_TYPES = [
        'commercial_document',
        'party',
        'expense',
        'product',
        'employee',
        'payment',
        'check',
        'treasury_account',
    ];

    // أقصى حجم للملف: 20 MB
    private const MAX_FILE_SIZE_KB = 20480;

    // امتدادات مسموحة
    private const ALLOWED_EXTENSIONS = [
        'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp',
        'doc', 'docx', 'xls', 'xlsx', 'csv',
        'txt', 'zip',
    ];

    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // الملف — يمكن رفع ملف جديد أو تمرير مسار موجود
            'file'             => [
                Rule::requiredIf(fn () => empty($this->input('file_path'))),
                'file',
                'max:' . self::MAX_FILE_SIZE_KB,
                'mimes:' . implode(',', self::ALLOWED_EXTENSIONS),
            ],
            // مسار موجود مسبقاً (للحفظ بعد رفع منفصل via presigned URL)
            'file_path'        => ['nullable', 'string', 'max:500',
                                    Rule::requiredIf(fn () => empty($this->file('file')))],

            // معلومات الملف (تُحسب تلقائياً من الملف إذا لم تُرسَل)
            'file_name'        => 'nullable|string|max:255',
            'file_type'        => 'nullable|string|max:50',
            'file_extension'   => 'nullable|string|max:10',
            'file_size'        => 'nullable|integer|min:0',

            // الكيان المرتبط (Polymorphic)
            'attachable_type'  => ['required', 'string', Rule::in(self::ALLOWED_TYPES)],
            'attachable_id'    => 'required|integer|min:1',

            // بيانات وصفية
            'title'            => 'nullable|string|max:200',
            'description'      => 'nullable|string|max:1000',
            'category'         => 'nullable|string|max:50',

            // خيارات الوصول
            'is_public'        => 'nullable|boolean',
            'disk'             => ['nullable', 'string', Rule::in(['local', 'public', 's3'])],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required'              => 'الملف مطلوب',
            'file.max'                   => 'حجم الملف يجب أن لا يتجاوز 20 ميجابايت',
            'file.mimes'                 => 'نوع الملف غير مدعوم. الأنواع المقبولة: ' . implode(', ', self::ALLOWED_EXTENSIONS),
            'attachable_type.required'   => 'نوع الكيان المرتبط مطلوب',
            'attachable_type.in'         => 'نوع الكيان غير مدعوم',
            'attachable_id.required'     => 'معرّف الكيان المرتبط مطلوب',
        ];
    }
}


