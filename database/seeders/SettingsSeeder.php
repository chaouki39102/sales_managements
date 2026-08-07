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
                'value'         => false,
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

            // ══════════════════════════════════════════
            // group: portal — بوابة الزبائن (اطلب سلعة)
            // ══════════════════════════════════════════
            'portal_enabled' => [
                'value'         => true,
                'group'         => 'portal',
                'type'          => 'boolean',
                'description'   => 'تفعيل بوابة الزبائن (كتالوج «اطلب سلعة» وإرسال الطلبات)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 100,
            ],
            'portal_allow_guest_orders' => [
                'value'         => true,
                'group'         => 'portal',
                'type'          => 'boolean',
                'description'   => 'السماح للزوار (بدون حساب بوابة) بالاطلاع على الكتالوج وإرسال الطلبات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 101,
            ],
            'portal_allow_registered_orders' => [
                'value'         => true,
                'group'         => 'portal',
                'type'          => 'boolean',
                'description'   => 'السماح للزبائن أصحاب حسابات البوابة بإرسال الطلبات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 102,
            ],
            'portal_min_order_amount' => [
                'value'         => 0,
                'group'         => 'portal',
                'type'          => 'float',
                'description'   => 'الحد الأدنى لمبلغ الطلب (دج) — 0 يعني بدون حد',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 103,
            ],
            'portal_max_order_amount' => [
                'value'         => 0,
                'group'         => 'portal',
                'type'          => 'float',
                'description'   => 'الحد الأقصى لمبلغ الطلب (دج) — 0 يعني بدون حد',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 104,
            ],
            'portal_order_confirmation_message' => [
                'value'         => '',
                'group'         => 'portal',
                'type'          => 'string',
                'description'   => 'رسالة التأكيد المعروضة للزبون بعد إرسال الطلب (تُظهر الرسالة الافتراضية إن تُركت فارغة)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 105,
            ],

            // ══════════════════════════════════════════
            // group: documents — إعدادات المستندات الافتراضية
            // ══════════════════════════════════════════
            'default_warehouse_id' => [
                'value'         => null,
                'group'         => 'documents',
                'type'          => 'integer',
                'description'   => 'المستودع الافتراضي عند إنشاء مستند (اختر من المستودعات النشطة)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 70,
            ],
            'default_currency_id' => [
                'value'         => 1,
                'group'         => 'documents',
                'type'          => 'integer',
                'description'   => 'العملة الافتراضية للمستندات (DZD = 1)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 71,
            ],
            'default_price_level_id' => [
                'value'         => null,
                'group'         => 'documents',
                'type'          => 'integer',
                'description'   => 'فئة السعر الافتراضية للزبون إذا لم تكن لديه فئة محددة',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 72,
            ],
            'default_payment_mode_id' => [
                'value'         => null,
                'group'         => 'documents',
                'type'          => 'integer',
                'description'   => 'طريقة الدفع الافتراضية للمدفوعات النقدية',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 73,
            ],
            'default_treasury_account_id' => [
                'value'         => null,
                'group'         => 'documents',
                'type'          => 'integer',
                'description'   => 'حساب الخزينة الافتراضي للمدفوعات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 74,
            ],
            'default_fiscal_year_behavior' => [
                'value'         => 'current',
                'group'         => 'documents',
                'type'          => 'string',
                'description'   => 'سلوك السنة المالية: current (تلقائي) | prompt (طلب من المستخدم)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 77,
            ],
            'documents_default_line_mode' => [
                'value'         => 'table',
                'group'         => 'documents',
                'type'          => 'string',
                'description'   => 'وضع عرض الأسطر الافتراضي: table | card',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 78,
            ],
            'documents_default_visible_cols' => [
                'value'         => ["idx","product","packaging","quantity","unit_price","discount","tva","total_ttc","actions"],
                'group'         => 'documents',
                'type'          => 'json',
                'description'   => 'الأعمدة الظاهرة في جدول الأسطر',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 79,
            ],

            // ══════════════════════════════════════════
            // group: inventory — توسعة سياسات المخزون
            // ══════════════════════════════════════════
            'allow_negative_stock_on_sale' => [
                'value'         => false,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'سياسة البيع عند نقص المخزون: true = تطبيق إعداد المنتج، false = منع البيع نهائياً',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 46,
            ],
            'auto_create_lot_on_purchase' => [
                'value'         => true,
                'group'         => 'inventory',
                'type'          => 'boolean',
                'description'   => 'إنشاء دفعة (Lot) تلقائياً عند شراء منتج يدير اللوطات',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 47,
            ],

            // ══════════════════════════════════════════
            // group: print — إعدادات الطباعة
            // ══════════════════════════════════════════
            'print:doc_configs' => [
                'value'         => self::getDefaultPrintDocConfigs(),
                'group'         => 'print',
                'type'          => 'json',
                'description'   => 'تكوين الطباعة لكل نوع مستند (حجم الورق، النسخ، طباعة تلقائية، معاينة)',
                'is_public'     => false,
                'is_editable'   => true,
                'display_order' => 90,
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

        // تعيين فئة السعر الافتراضية من أول فئة سعر is_default=true
        $defaultPriceLevelId = DB::table('price_levels')
            ->where('company_id', $companyId)
            ->where('is_default', true)
            ->value('id');
        if ($defaultPriceLevelId) {
            $settings['default_price_level_id']['value'] = $defaultPriceLevelId;
        }

        // العملة الافتراضية: يجب أن تُحلّ من عملة المؤسسة الفعلية، لا قيمة ثابتة 1
        // (currencies معرفاتها تسلسلية عامة — بعد المؤسسة الأولى لا تكون 1 بالضرورة).
        $defaultCurrencyId = DB::table('currencies')
            ->where('company_id', $companyId)
            ->orderBy('is_default', 'desc')
            ->orderBy('id')
            ->value('id');
        if ($defaultCurrencyId) {
            $settings['default_currency_id']['value'] = $defaultCurrencyId;
        }

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

    /**
     * Default print document configs for each doc type.
     * POS: enabled with 80mm thermal + auto-print + preview.
     * Others: enabled with A4 + preview (no auto-print).
     */
    private static function getDefaultPrintDocConfigs(): array
    {
        $docTypes = [
            ['code' => 'POS', 'name' => 'مبيعات POS',       'paperSize' => '80mm',  'autoPrint' => true,  'showPreview' => true],
            ['code' => 'FV',  'name' => 'Facture de vente',  'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'BL',  'name' => 'Bon de livraison',  'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'DEV', 'name' => 'Devis',             'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'BCC', 'name' => 'Bon de commande client', 'paperSize' => 'A4', 'autoPrint' => false, 'showPreview' => true],
            ['code' => 'AV',  'name' => 'Avoir sur vente',   'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'AA',  'name' => 'Avoir sur achat',   'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'FA',  'name' => "Facture d'achat",   'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'BR',  'name' => 'Bon de réception',  'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'DDP', 'name' => 'Demande de prix',   'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'BT',  'name' => 'Bon de transfert',  'paperSize' => 'A4',    'autoPrint' => false, 'showPreview' => true],
            ['code' => 'BCF', 'name' => 'Bon de commande fournisseur', 'paperSize' => 'A4', 'autoPrint' => false, 'showPreview' => true],
        ];

        return array_map(fn($d) => [
            'docTypeCode'  => $d['code'],
            'docTypeName'  => $d['name'],
            'enabled'      => true,
            'paperSize'    => $d['paperSize'],
            'printerId'    => null,
            'copies'       => 1,
            'autoPrint'    => $d['autoPrint'],
            'showPreview'  => $d['showPreview'],
            'templates'    => [$d['paperSize']],
        ], $docTypes);
    }
}
