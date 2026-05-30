<?php
/**
 * ════════════════════════════════════════════════════════════════════
 * Company Model — إضافة getRouteKeyName()
 *
 * أضف هذا الـ method لـ app/Models/Company.php
 * إذا لم يكن موجوداً — فهو ضروري لإصلاح 404 عند PUT /companies/{slug}
 * ════════════════════════════════════════════════════════════════════
 *
 * ضع هذا الـ method داخل class Company extends Model:
 */

/*
    // ✅ أضف هذا داخل Company model
    public function getRouteKeyName(): string
    {
        return 'slug';
    }
*/

/**
 * إذا كان لديك Company model موجود بالفعل، افتح الملف وأضف فقط:
 *
 * public function getRouteKeyName(): string
 * {
 *     return 'slug';
 * }
 *
 * أو تأكد من وجوده أصلاً.
 *
 * ══════════════════════════════════════════════════════════════════
 * كذلك تأكد من وجود هذه الـ fillable fields في Company model:
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyModelPatch
{
    // هذا الملف للتوثيق فقط — لا تنسخه مباشرة
    // أضف getRouteKeyName() لـ app/Models/Company.php يدوياً

    public static function getRequiredFields(): array
    {
        return [
            'fillable' => [
                'name', 'commercial_name', 'slug', 'activity',
                'rc', 'rc_date', 'nif', 'nis', 'ai',
                'legal_form_id', 'capital_amount',
                'address', 'wilaya_id', 'commune_id',
                'phone', 'mobile', 'fax', 'email',
                'bank_name', 'rib',
                'avatar', 'plan',
                'active', 'is_verified', 'is_suspended',
                'max_users', 'max_warehouses', 'max_products',
                'trial_ends_at', 'company_id',
            ],
            'casts' => [
                'active'        => 'boolean',
                'is_verified'   => 'boolean',
                'is_suspended'  => 'boolean',
                'capital_amount'=> 'decimal:2',
                'trial_ends_at' => 'datetime',
            ],
        ];
    }
}
