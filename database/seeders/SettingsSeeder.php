<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * SettingsSeeder — البيانات الافتراضية لإعدادات الشركة
 * ══════════════════════════════════════════════════════════════════
 *
 * الإضافات الجديدة:
 * - دالة toStorageValue() لتوحيد طريقة تخزين القيم مع SettingService
 * - استخدام القيم الأصلية (PHP) في getDefaultSettings ثم تحويلها
 *
 * يُشغَّل بطريقتين:
 * 1. عند إنشاء شركة جديدة: CompanyObserver ← CompanySeeder ← SettingsSeeder
 * 2. php artisan db:seed --class=SettingsSeeder (للنظام العام)
 *
 * الاستخدام المباشر مع company_id:
 *   (new SettingsSeeder)->seedForCompany($companyId);
 */
class SettingsSeeder extends Seeder
{
    /**
     * تحويل القيمة إلى نص للتخزين في قاعدة البيانات
     * متوافق مع SettingService::prepareValueForStorage()
     */
    private function toStorageValue(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE);
        }
        return (string) $value;
    }

    /**
     * إعدادات افتراضية شاملة لكل التبويبات
     * key => [value, group, type, description, is_public, is_editable, display_order]
     *
     * ✅ القيم مكتوبة بصيغتها الأصلية (PHP) لتسهيل الصيانة
     * ✅ سيتم تحويلها تلقائياً عبر toStorageValue()
     */
    private function getDefaultSettings(): array
    {
        return [
            // ══════════════════════════════════════════
            // group: invoice — تصاميم الفاتورة
            // ══════════════════════════════════════════
            'invoice_design' => [
                'value'         => 'classic',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'تصميم الفاتورة: classic | modern | minimal | professional',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 10,
            ],
            'invoice_header_color' => [
                'value'         => '#0a7c52',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'لون ترويسة الفاتورة (hex)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 11,
            ],
            'invoice_paper_size' => [
                'value'         => 'A4',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'حجم ورق الطباعة: A4 | A5 | thermal',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 12,
            ],
            'invoice_font_size' => [
                'value'         => 'medium',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'حجم الخط: small | medium | large',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 13,
            ],
            'price_mode' => [
                'value'         => 'ttc',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'وضع الأسعار الافتراضي: ht | ttc',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 14,
            ],
            'invoice_show_logo' => [
                'value'         => true,          // ✅ boolean أصلي
                'group'         => 'invoice',
                'type'          => 'boolean',
                'description'   => 'إظهار الشعار في الفاتورة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 15,
            ],
            'invoice_show_stamp' => [
                'value'         => true,
                'group'         => 'invoice',
                'type'          => 'boolean',
                'description'   => 'إظهار خانة الختم والإمضاء',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 16,
            ],
            'invoice_show_sign' => [
                'value'         => true,
                'group'         => 'invoice',
                'type'          => 'boolean',
                'description'   => 'إظهار التوقيع الرقمي',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 17,
            ],
            'invoice_show_watermark' => [
                'value'         => false,
                'group'         => 'invoice',
                'type'          => 'boolean',
                'description'   => 'إظهار علامة مائية "نسخة"',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 18,
            ],
            'invoice_footer_text' => [
                'value'         => '',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'نص التذييل في الفاتورة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 19,
            ],
            'invoice_legal_text' => [
                'value'         => '',
                'group'         => 'invoice',
                'type'          => 'string',
                'description'   => 'النص القانوني الإلزامي في الفاتورة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 20,
            ],

            // ══════════════════════════════════════════
            // group: fiscal — المالية والضرائب
            // ══════════════════════════════════════════
            'tax_regime' => [
                'value'         => 'reel',
                'group'         => 'fiscal',
                'type'          => 'string',
                'description'   => 'النظام الضريبي: forfaitaire | reel',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 30,
            ],
            'entity_type' => [
                'value'         => 'pers_morale',
                'group'         => 'fiscal',
                'type'          => 'string',
                'description'   => 'نوع الكيان: pers_morale | pers_physique',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 31,
            ],
            'ifu_rate' => [
                'value'         => '12',
                'group'         => 'fiscal',
                'type'          => 'string',
                'description'   => 'معدل IFU الجزافي: 5 | 12',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 32,
            ],
            'default_tva_rate' => [
                'value'         => '19',
                'group'         => 'fiscal',
                'type'          => 'string',
                'description'   => 'معدل TVA الافتراضي: 19 | 9',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 33,
            ],
            'fiscal_stamp_enabled' => [
                'value'         => true,
                'group'         => 'fiscal',
                'type'          => 'boolean',
                'description'   => 'تفعيل الطابع الجبائي',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 34,
            ],
            'fiscal_stamp_threshold' => [
                'value'         => 30000,          // ✅ integer أصلي
                'group'         => 'fiscal',
                'type'          => 'integer',
                'description'   => 'الحد الأدنى لتطبيق الطابع الجبائي (دج)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 35,
            ],
            'default_currency' => [
                'value'         => 'DZD',
                'group'         => 'fiscal',
                'type'          => 'string',
                'description'   => 'العملة الافتراضية',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 36,
            ],
            'year_regimes' => [
                'value'         => [],             // ✅ مصفوفة فارغة
                'group'         => 'fiscal',
                'type'          => 'json',
                'description'   => 'النظام الضريبي لكل سنة مالية {yearId: regime}',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 37,
            ],

            // ══════════════════════════════════════════
            // group: inventory — المخزون
            // ══════════════════════════════════════════
            'default_valuation_method' => [
                'value'         => 'weighted_average',
                'group'         => 'inventory',
                'type'          => 'string',
                'description'   => 'طريقة تقييم المخزون: fifo | lifo | weighted_average',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 40,
            ],
            'allow_negative_stock' => [
                'value'         => false,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'السماح بالمخزون السالب',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 41,
            ],
            'manage_lots' => [
                'value'         => false,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'تفعيل إدارة اللوطات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 42,
            ],
            'manage_expiry' => [
                'value'         => false,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'تفعيل إدارة تواريخ الانتهاء',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 43,
            ],
            'low_stock_default_threshold' => [
                'value'         => 10,
                'group'         => 'inventory',
                'type'          => 'integer',
                'description'   => 'حد تنبيه المخزون الافتراضي (وحدة)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 44,
            ],
            'auto_adjust_on_document' => [
                'value'         => true,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'تحديث المخزون تلقائياً عند التحقق من الوثيقة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 45,
            ],

            // ══════════════════════════════════════════
            // group: alerts — التنبيهات
            // ══════════════════════════════════════════
            'alert_low_stock' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه عند انخفاض المخزون',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 50,
            ],
            'alert_out_of_stock' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه عند نفاذ المخزون',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 51,
            ],
            'low_stock_threshold' => [
                'value'         => 10,
                'group'         => 'alerts',
                'type'          => 'integer',
                'description'   => 'حد التنبيه لانخفاض المخزون',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 52,
            ],
            'alert_debt_due' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه قبل استحقاق فاتورة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 53,
            ],
            'debt_due_days' => [
                'value'         => 7,
                'group'         => 'alerts',
                'type'          => 'integer',
                'description'   => 'عدد أيام التنبيه قبل الاستحقاق',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 54,
            ],
            'alert_overdue_debts' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه عند الديون المتأخرة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 55,
            ],
            'alert_fiscal_close' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه قبل إقفال السنة المالية',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 56,
            ],
            'fiscal_close_days' => [
                'value'         => 30,
                'group'         => 'alerts',
                'type'          => 'integer',
                'description'   => 'عدد أيام التنبيه قبل إقفال السنة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 57,
            ],
            'alert_g50' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه موعد G50 الشهري',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 58,
            ],
            'g50_days_before' => [
                'value'         => 5,
                'group'         => 'alerts',
                'type'          => 'integer',
                'description'   => 'عدد أيام التنبيه قبل موعد G50',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 59,
            ],
            'alert_g12bis' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه موعد G12bis السنوي',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 60,
            ],
            'alert_g12' => [
                'value'         => true,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه موعد G12',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 61,
            ],
            'alert_draft_docs' => [
                'value'         => false,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'تنبيه عند وجود مسودات قديمة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 62,
            ],
            'draft_docs_days' => [
                'value'         => 3,
                'group'         => 'alerts',
                'type'          => 'integer',
                'description'   => 'عدد أيام المسودة قبل التنبيه',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 63,
            ],
            'email_notifications' => [
                'value'         => false,
                'group'         => 'alerts',
                'type'          => 'boolean',
                'description'   => 'إرسال ملخص يومي بالبريد',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 64,
            ],
            'notif_email' => [
                'value'         => '',
                'group'         => 'alerts',
                'type'          => 'string',
                'description'   => 'بريد استقبال الإشعارات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 65,
            ],
        ];
    }

    /**
     * تشغيل الـ seeder للنظام (company_id = null)
     */
    public function run(): void
    {
        $this->seedForCompany(null);
    }

    /**
     * ✅ تشغيل الـ seeder لشركة محددة
     * يُستدعى من CompanyObserver ← CompanySeeder
     */
    public function seedForCompany(?int $companyId): void
    {
        $now      = now();
        $settings = $this->getDefaultSettings();

        foreach ($settings as $key => $config) {
            // تحويل القيمة إلى نص باستخدام نفس منطق SettingService
            $storedValue = $this->toStorageValue($config['value']);

            DB::table('settings')->updateOrInsert(
                [
                    'key'        => $key,
                    'company_id' => $companyId,
                ],
                [
                    'group'         => $config['group'],
                    'value'         => $storedValue,
                    'type'          => $config['type'],
                    'description'   => $config['description'],
                    'is_public'     => $config['is_public'],
                    'is_editable'   => $config['is_editable'],
                    'display_order' => $config['display_order'],
                    'updated_at'    => $now,
                    'created_at'    => $now,
                ]
            );
        }
    }
}
