<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Store Party Request
 *
 * التحقق من صحة بيانات إنشاء متعامل جديد
 */
class StorePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Party type (required)
            'party_type_id' => 'required|exists:party_types,id',

            // Basic information
            'code' => 'nullable|string|max:50|unique:parties,code',
            'name' => 'required|string|max:150',
            'commercial_name' => 'nullable|string|max:150',

            // Algerian legal information
            'activity' => 'nullable|string|max:500',
            'rc' => 'nullable|string|max:50',
            'nif' => 'nullable|string|regex:/^\d{15,16}$/|unique:parties,nif',
            'nis' => 'nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'nullable|string|max:50',
            'legal_form_id' => 'nullable|exists:legal_forms,id',
            'capital_amount' => 'nullable|numeric|min:0',
            'rc_date' => 'nullable|date|before:today',

            // Contact information
            'address' => 'nullable|string|max:500',
            'commune_id' => 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:30',
            'fax' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100|unique:parties,email',

            // Banking information
            'bank_name' => 'nullable|string|max:100',
            'rib' => 'nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'nullable|numeric',
            'credit_limit' => 'nullable|numeric|min:0',
            'default_price_level_id' => 'nullable|exists:price_levels,id',
            'credit_days' => 'nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'nullable|boolean',
            'is_taxable' => 'nullable|boolean',
            'tax_option' => 'nullable|string|max:50',
            'cnas_number' => 'nullable|string|max:50',
            'tax_regime' => 'nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'nullable|boolean',
            'is_vat_registered' => 'nullable|boolean',
            'vat_registration_date' => 'nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'nullable|array',
            'active' => 'nullable|boolean',

            // Fields from POS modal (converted in prepareForValidation)
            'is_client' => 'nullable|boolean',
            'is_supplier' => 'nullable|boolean',
            'trade_name' => 'nullable|string|max:150',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.required' => 'نوع المتعامل مطلوب',
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

    public function prepareForValidation()
    {
        // تحويل is_client / is_supplier إلى party_type_id
        if (!$this->has('party_type_id')) {
            $isClient   = $this->input('is_client');
            $isSupplier = $this->input('is_supplier');
            if ($isClient !== null || $isSupplier !== null) {
                $typeName = filter_var($isClient ?? $isSupplier, FILTER_VALIDATE_BOOLEAN)
                    ? ($isClient ? 'client' : 'supplier')
                    : ($isSupplier ? 'supplier' : 'client');
                $type = \App\Models\PartyType::withoutGlobalScope(\App\Models\Scopes\CompanyScope::class)
                    ->where(fn($q) => $q->where('name', $typeName)->orWhere('slug', $typeName))
                    ->first();
                if ($type) {
                    $this->merge(['party_type_id' => $type->id]);
                }
            }
        }

        // trade_name → commercial_name
        if ($this->has('trade_name') && !$this->has('commercial_name')) {
            $this->merge(['commercial_name' => $this->input('trade_name')]);
        }

        // Set default values
        if (!$this->has('active')) {
            $this->merge(['active' => true]);
        }
        if (!$this->has('is_taxable')) {
            $this->merge(['is_taxable' => true]);
        }
        if (!$this->has('initial_balance')) {
            $this->merge(['initial_balance' => 0.00]);
        }
        if (!$this->has('credit_limit')) {
            $this->merge(['credit_limit' => 0.00]);
        }
    }
}