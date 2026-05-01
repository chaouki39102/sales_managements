<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // نحتاج للمنتج قبل التحقق من الصلاحية، لذا نجلب المنتج من قاعدة البيانات
        $product = \App\Models\Product::find($this->product_id);
        if (!$product) {
            return false;
        }
        return $this->user()->can('create', [\App\Models\Barcode::class, $product]);
    }

    public function rules(): array
    {
        return [
            'product_id' => [
                'required',
                'integer',
                // التحقق من أن المنتج موجود وينتمي لنفس الشركة النشطة
                Rule::exists('products', 'id')->where(function ($query) {
                    $query->where('company_id', $this->user()->current_company_id);
                }),
            ],
            'barcode' => [
                'required',
                'string',
                'max:255',
                // أيضا التحقق من أن الباركود فريد ضمن نطاق الشركة نفسها (اختياري لكن مفيد)
                Rule::unique('barcodes', 'barcode')->where(function ($query) {
                    $query->where('company_id', $this->user()->current_company_id);
                }),
            ],
            'type' => 'nullable|string|max:50',
            'is_primary' => 'boolean',
            'unit' => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.exists' => 'المنتج غير موجود أو لا يتبع شركتك.',
            'barcode.unique' => 'هذا الباركود مسجل مسبقاً ضمن شركتك.',
            'product_id.required' => 'المنتج مطلوب.',
        ];
    }

    // يمكن إضافة prepareForValidation() لتعيين current_company_id تلقائياً إذا لم يكن موجوداً
    protected function prepareForValidation(): void
    {
        // إذا لم يكن المستخدم يمتلك current_company_id في الجلسة، نجلبه من الـ service
        if (!$this->user()->current_company_id) {
            $companyId = app(\App\Services\CompanyContextService::class)->get();
            $this->user()->current_company_id = $companyId;
        }
    }
}
