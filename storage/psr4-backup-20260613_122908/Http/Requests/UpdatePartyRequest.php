<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Party Request
 *
 * التحقق من صحة بيانات تحديث متعامل موجود
 */
class UpdatePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $partyId = $this->route('party')?->id ?? $this->route('id');

        return [
            // Party type
            'party_type_id' => 'sometimes|exists:party_types,id',

            // Basic information
            'code' => "sometimes|nullable|string|max:50|unique:parties,code,{$partyId}",
            'name' => 'sometimes|required|string|max:150',
            'commercial_name' => 'sometimes|nullable|string|max:150',

            // Algerian legal information
            'activity' => 'sometimes|nullable|string|max:500',
            'rc' => 'sometimes|nullable|string|max:50',
            'nif' => "sometimes|nullable|string|regex:/^\d{15,16}$/|unique:parties,nif,{$partyId}",
            'nis' => 'sometimes|nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'sometimes|nullable|string|max:50',
            'legal_form_id' => 'sometimes|nullable|exists:legal_forms,id',
            'capital_amount' => 'sometimes|nullable|numeric|min:0',
            'rc_date' => 'sometimes|nullable|date|before:today',

            // Contact information
            'address' => 'sometimes|nullable|string|max:500',
            'commune_id' => 'sometimes|nullable|exists:communes,id',
            'wilaya_id' => 'sometimes|nullable|exists:wilayas,id',
            'phone' => 'sometimes|nullable|string|max:20',
            'mobile' => 'sometimes|nullable|string|max:30',
            'fax' => 'sometimes|nullable|string|max:30',
            'email' => "sometimes|nullable|email|max:100|unique:parties,email,{$partyId}",

            // Banking information
            'bank_name' => 'sometimes|nullable|string|max:100',
            'rib' => 'sometimes|nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'sometimes|nullable|numeric',
            'credit_limit' => 'sometimes|nullable|numeric|min:0',
            'default_price_level_id' => 'sometimes|nullable|exists:price_levels,id',
            'credit_days' => 'sometimes|nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'sometimes|nullable|boolean',
            'is_taxable' => 'sometimes|nullable|boolean',
            'tax_option' => 'sometimes|nullable|string|max:50',
            'cnas_number' => 'sometimes|nullable|string|max:50',
            'tax_regime' => 'sometimes|nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'sometimes|nullable|boolean',
            'is_vat_registered' => 'sometimes|nullable|boolean',
            'vat_registration_date' => 'sometimes|nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'sometimes|nullable|array',
            'active' => 'sometimes|nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.exists' => 'نوع المتعامل غير صحيح',
            'code.unique' => 'الرمز موجود بالفعل',
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم يجب أن لا يتجاوز 150 حرف',
            'commercial_name.max' => 'الاسم التجاري يجب أن لا يتجاوز 150 حرف',
            'rc.max' => 'رقم السجل التجاري يجب أن لا يتجاوز 50 حرف',
            'nif.regex' => 'رقم التعريف الجبائي يجب أن يكون 15-16 رقم',
            'nif.unique' => 'رقم التعريف الجبائي موجود بالفعل',
            'nis.regex' => 'رقم التعريف الإحصائي يجب أن يكون 10-15 رقم',
            'ai.max' => 'المادة الجبائية يجب أن لا تتجاوز 50 حرف',
            'legal_form_id.exists' => 'الشكل القانوني غير صحيح',
            'capital_amount.numeric' => 'رأس المال يجب أن يكون رقماً',
            'capital_amount.min' => 'رأس المال يجب أن يكون موجباً',
            'rc_date.date' => 'تاريخ السجل التجاري غير صحيح',
            'rc_date.before' => 'تاريخ السجل التجاري يجب أن يكون في الماضي',
            'address.max' => 'العنوان يجب أن لا يتجاوز 500 حرف',
            'commune_id.exists' => 'البلدية غير صحيحة',
            'wilaya_id.exists' => 'الولاية غير صحيحة',
            'phone.max' => 'الهاتف يجب أن لا يتجاوز 20 حرف',
            'mobile.max' => 'الجوال يجب أن لا يتجاوز 30 حرف',
            'fax.max' => 'الفاكس يجب أن لا يتجاوز 30 حرف',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.unique' => 'البريد الإلكتروني موجود بالفعل',
            'bank_name.max' => 'اسم البنك يجب أن لا يتجاوز 100 حرف',
            'rib.max' => 'RIB يجب أن لا يتجاوز 30 حرف',
            'initial_balance.numeric' => 'الرصيد الابتدائي يجب أن يكون رقماً',
            'credit_limit.numeric' => 'الحد الائتماني يجب أن يكون رقماً',
            'credit_limit.min' => 'الحد الائتماني يجب أن يكون موجباً',
            'default_price_level_id.exists' => 'مستوى السعر الافتراضي غير صحيح',
            'credit_days.integer' => 'أيام الائتمان يجب أن تكون رقماً صحيحاً',
            'credit_days.min' => 'أيام الائتمان يجب أن تكون موجبة',
            'credit_days.max' => 'أيام الائتمان يجب أن لا تتجاوز 365 يوم',
            'is_tva_exempt.boolean' => 'معفى من TVA يجب أن يكون صحيح أو خطأ',
            'is_taxable.boolean' => 'خاضع للضريبة يجب أن يكون صحيح أو خطأ',
            'tax_option.max' => 'خيار الضريبة يجب أن لا يتجاوز 50 حرف',
            'cnas_number.max' => 'رقم CNAS يجب أن لا يتجاوز 50 حرف',
            'tax_regime.in' => 'نظام الضريبة يجب أن يكون forfaitaire أو réel',
            'is_final_consumer.boolean' => 'مستهلك نهائي يجب أن يكون صحيح أو خطأ',
            'is_vat_registered.boolean' => 'مسجل في TVA يجب أن يكون صحيح أو خطأ',
            'vat_registration_date.date' => 'تاريخ التسجيل في TVA غير صحيح',
            'vat_registration_date.before_or_equal' => 'تاريخ التسجيل في TVA يجب أن يكون اليوم أو في الماضي',
            'additional_data.array' => 'البيانات الإضافية يجب أن تكون مصفوفة',
            'active.boolean' => 'التفعيل يجب أن يكون صحيح أو خطأ',
        ];
    }
}