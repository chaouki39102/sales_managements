<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreProductRequest
 *
 * الإصلاح: قواعد unique الأصلية كانت global (unique:products,ref)
 * مما يمنع شركتين مختلفتين من استخدام نفس ref/barcode/slug.
 *
 * الصحيح في بيئة Multi-Tenancy: الـ unique يكون بنطاق company_id
 * باستخدام Rule::unique()->where('company_id', ...).
 */
class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ✅ company_id من السياق — HasCompany يضبطه تلقائياً عند الحفظ،
        //    لكن نحتاجه هنا للتحقق من الـ unique.
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // ── المنتج الأساسي ──
            'name'            => 'required|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id
            'slug'    => [
                'nullable', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'required|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            // ── التسعير والمخزون ──
            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

            // ── الأبعاد ──
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            // ── وحدات التعبئة (Colisages) ──
            'packagings'                 => 'nullable|array',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            // ✅ إصلاح: unique مقيّد بـ company_id
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            // ── التعريفات (Tarifs) ──
            'prices'                  => 'nullable|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts'                       => 'nullable|array',
            'quantity_discounts.*.price_level_id'      => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'             => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'             => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'     => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'          => 'nullable|boolean',
            'quantity_discounts.*.active'              => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                            => 'اسم المنتج مطلوب',
            'product_type_id.required'                 => 'نوع المنتج مطلوب',
            'ref.unique'                               => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                           => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                              => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.code.required_with'          => 'رمز التعبئة مطلوب عند إضافة تعبئة',
            'packagings.*.label.required_with'         => 'تسمية التعبئة مطلوبة عند إضافة تعبئة',
            'packagings.*.barcode.unique'              => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.price_level_id.required_with'   => 'مستوى السعر مطلوب عند إضافة تعريف',
            'prices.*.pricing_method.required_with'   => 'طريقة التسعير مطلوبة عند إضافة تعريف',
            'prices.*.pricing_method.in'              => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.min_qty.required_with' => 'الحد الأدنى للكمية مطلوب عند إضافة خصم',
            'quantity_discounts.*.max_qty.gt'         => 'الحد الأعلى يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}
