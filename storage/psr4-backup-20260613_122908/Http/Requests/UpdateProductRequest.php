<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * UpdateProductRequest
 *
 * الإصلاح: نفس إصلاح StoreProductRequest — قواعد unique مقيّدة بـ company_id
 * مع استثناء السجل الحالي (ignore).
 */
class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('product');

        // ✅ company_id من السياق
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'            => 'sometimes|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            'slug'    => [
                'sometimes', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'sometimes|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            'packagings'                 => 'sometimes|array',
            'packagings.*.id'            => 'nullable|integer|exists:product_packagings,id',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            // ملاحظة: لا يمكن استخدام wildcard في ignore مع nested arrays — نتحقق في Service
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            'prices'                  => 'sometimes|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            'quantity_discounts'                       => 'sometimes|array',
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
            'ref.unique'                             => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                         => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                            => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.barcode.unique'            => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.pricing_method.in'             => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.max_qty.gt'        => 'الحد الأعلى للكمية يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}
