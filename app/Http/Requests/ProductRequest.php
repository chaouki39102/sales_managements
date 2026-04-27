<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreProductRequest — التحقق من بيانات إنشاء المنتج
 *
 * ملاحظة: variants يتم التحقق منها هنا بشكل مبسط.
 * التحقق التفصيلي يتم في ProductService.
 */
class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // بيانات المنتج الأساسية
            'name'                 => 'required|string|max:255',
            'slug'                 => 'nullable|string|max:255|unique:products,slug',
            'description'          => 'nullable|string',
            'family_id'            => 'nullable|integer|exists:families,id',
            'brand_id'             => 'nullable|integer|exists:brands,id',
            'product_type_id'      => 'nullable|integer|exists:product_types,id',
            'specifications'       => 'nullable|array',
            'images'               => 'nullable|array',
            'images.*'             => 'nullable|string|url',
            'meta_title'           => 'nullable|string|max:255',
            'meta_description'     => 'nullable|string|max:500',
            'meta_keywords'        => 'nullable|array',
            'active'               => 'nullable|boolean',

            // المتغيرات
            'variants'                               => 'nullable|array',
            'variants.*.ref'                         => 'required|string|max:100',
            'variants.*.variant_name'                => 'nullable|string|max:255',
            'variants.*.barcode'                     => 'nullable|string|max:100',
            'variants.*.default_selling_price_ht'    => 'nullable|numeric|min:0',
            'variants.*.last_purchase_price'         => 'nullable|numeric|min:0',
            'variants.*.tva_id'                      => 'nullable|integer|exists:tvas,id',
            'variants.*.unit_id'                     => 'nullable|integer|exists:units,id',
            'variants.*.min_stock_alert'             => 'nullable|numeric|min:0',
            'variants.*.active'                      => 'nullable|boolean',
            'variants.*.manages_stock'               => 'nullable|boolean',
            'variants.*.manages_quantity_discounts'  => 'nullable|boolean',
            'variants.*.weight'                      => 'nullable|numeric|min:0',
            'variants.*.volume'                      => 'nullable|numeric|min:0',
            'variants.*.length'                      => 'nullable|numeric|min:0',
            'variants.*.width'                       => 'nullable|numeric|min:0',
            'variants.*.height'                      => 'nullable|numeric|min:0',
            'variants.*.variant_attributes'          => 'nullable|array',

            // أسعار المستويات لكل متغير
            'variants.*.prices'                      => 'nullable|array',
            'variants.*.prices.*.price_level_id'     => 'required|integer|exists:price_levels,id',
            'variants.*.prices.*.price'              => 'nullable|numeric|min:0',
            'variants.*.prices.*.valid_from'         => 'nullable|date',
            'variants.*.prices.*.valid_to'           => 'nullable|date|after_or_equal:variants.*.prices.*.valid_from',
            'variants.*.prices.*.active'             => 'nullable|boolean',

            // تخفيضات الكميات لكل متغير
            'variants.*.quantity_discounts'                        => 'nullable|array',
            'variants.*.quantity_discounts.*.min_quantity'         => 'required|numeric|min:0',
            'variants.*.quantity_discounts.*.max_quantity'         => 'nullable|numeric|min:0',
            'variants.*.quantity_discounts.*.discount_percentage'  => 'nullable|numeric|min:0|max:100',
            'variants.*.quantity_discounts.*.discount_per_unit'    => 'nullable|numeric|min:0',
            'variants.*.quantity_discounts.*.tier_order'           => 'nullable|integer|min:1',
            'variants.*.quantity_discounts.*.active'               => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'              => 'اسم المنتج مطلوب',
            'name.max'                   => 'اسم المنتج يجب ألا يتجاوز 255 حرفاً',
            'slug.unique'                => 'هذا الـ Slug مستخدم بالفعل',
            'variants.*.ref.required'    => 'مرجع المتغير مطلوب',
            'family_id.exists'           => 'الفئة المختارة غير موجودة',
            'brand_id.exists'            => 'العلامة التجارية المختارة غير موجودة',
            'product_type_id.exists'     => 'نوع المنتج المختار غير موجود',
            'variants.*.tva_id.exists'   => 'معدل TVA غير موجود',
            'variants.*.unit_id.exists'  => 'وحدة القياس غير موجودة',
        ];
    }
}

/**
 * UpdateProductRequest — التحقق من بيانات تعديل المنتج
 */
class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product');

        return [
            // بيانات المنتج الأساسية
            'name'             => 'sometimes|string|max:255',
            'slug'             => "sometimes|string|max:255|unique:products,slug,{$productId}",
            'description'      => 'nullable|string',
            'family_id'        => 'nullable|integer|exists:families,id',
            'brand_id'         => 'nullable|integer|exists:brands,id',
            'product_type_id'  => 'nullable|integer|exists:product_types,id',
            'specifications'   => 'nullable|array',
            'images'           => 'nullable|array',
            'images.*'         => 'nullable|string',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords'    => 'nullable|array',
            'active'           => 'nullable|boolean',

            // المتغيرات (اختيارية في التحديث)
            'variants'                               => 'sometimes|array',
            'variants.*.id'                          => 'nullable|integer|exists:product_variants,id',
            'variants.*.ref'                         => 'required_with:variants|string|max:100',
            'variants.*.variant_name'                => 'nullable|string|max:255',
            'variants.*.barcode'                     => 'nullable|string|max:100',
            'variants.*.default_selling_price_ht'    => 'nullable|numeric|min:0',
            'variants.*.last_purchase_price'         => 'nullable|numeric|min:0',
            'variants.*.tva_id'                      => 'nullable|integer|exists:tvas,id',
            'variants.*.unit_id'                     => 'nullable|integer|exists:units,id',
            'variants.*.min_stock_alert'             => 'nullable|numeric|min:0',
            'variants.*.active'                      => 'nullable|boolean',
            'variants.*.manages_stock'               => 'nullable|boolean',
            'variants.*.manages_quantity_discounts'  => 'nullable|boolean',
            'variants.*.weight'                      => 'nullable|numeric|min:0',
            'variants.*.volume'                      => 'nullable|numeric|min:0',
            'variants.*.length'                      => 'nullable|numeric|min:0',
            'variants.*.width'                       => 'nullable|numeric|min:0',
            'variants.*.height'                      => 'nullable|numeric|min:0',
            'variants.*.variant_attributes'          => 'nullable|array',

            'variants.*.prices'                      => 'nullable|array',
            'variants.*.prices.*.price_level_id'     => 'required|integer|exists:price_levels,id',
            'variants.*.prices.*.price'              => 'nullable|numeric|min:0',
            'variants.*.prices.*.valid_from'         => 'nullable|date',
            'variants.*.prices.*.valid_to'           => 'nullable|date',
            'variants.*.prices.*.active'             => 'nullable|boolean',

            'variants.*.quantity_discounts'                        => 'nullable|array',
            'variants.*.quantity_discounts.*.min_quantity'         => 'required|numeric|min:0',
            'variants.*.quantity_discounts.*.max_quantity'         => 'nullable|numeric|min:0',
            'variants.*.quantity_discounts.*.discount_percentage'  => 'nullable|numeric|min:0|max:100',
            'variants.*.quantity_discounts.*.discount_per_unit'    => 'nullable|numeric|min:0',
            'variants.*.quantity_discounts.*.active'               => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'                => 'اسم المنتج يجب ألا يتجاوز 255 حرفاً',
            'slug.unique'             => 'هذا الـ Slug مستخدم بالفعل',
            'variants.*.ref.required_with' => 'مرجع المتغير مطلوب',
            'family_id.exists'        => 'الفئة المختارة غير موجودة',
            'brand_id.exists'         => 'العلامة التجارية المختارة غير موجودة',
        ];
    }
}
