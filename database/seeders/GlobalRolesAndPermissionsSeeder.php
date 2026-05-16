<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * GlobalRolesAndPermissionsSeeder
 * ══════════════════════════════════════════════════════════════════
 * مسؤول حصراً عن:
 *  1. إنشاء جميع الصلاحيات العالمية (company_id = null)
 *  2. إنشاء دور super-admin العالمي ومنحه كل الصلاحيات
 *  3. تعيين دور super-admin للمستخدم الأول
 *
 * لا يلمس أي بيانات خاصة بالشركات.
 * أدوار الشركة (admin, manager, cashier…) تُنشأ عبر CompanySeeder
 * أو CompanyObserver::created() عند إنشاء أي شركة جديدة.
 * ══════════════════════════════════════════════════════════════════
 */
class GlobalRolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->seedPermissions();
        $this->seedSuperAdminRole();
        $this->assignSuperAdminUser();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command?->info('✅ GlobalRolesAndPermissionsSeeder: اكتمل بنجاح!');
    }

    // ─────────────────────────────────────────────────────────────
    // 1. الصلاحيات العالمية
    // ─────────────────────────────────────────────────────────────

    private function seedPermissions(): void
    {
        foreach ($this->getPermissions() as $perm) {
            Permission::firstOrCreate(
                [
                    'name'       => $perm['name'],
                    'guard_name' => 'web',
                    'company_id' => null,
                ],
                [
                    'display_name' => $perm['display_name'] ?? $perm['name'],
                    'group'        => $perm['group']        ?? 'عام',
                    'description'  => $perm['description']  ?? '',
                ]
            );
        }

        $count = Permission::whereNull('company_id')->count();
        $this->command?->info("✅ تم إنشاء {$count} صلاحية عالمية");
    }

    // ─────────────────────────────────────────────────────────────
    // 2. دور super-admin العالمي
    // ─────────────────────────────────────────────────────────────

    private function seedSuperAdminRole(): void
    {
        $superAdmin = Role::firstOrCreate(
            [
                'name'       => 'super-admin',
                'guard_name' => 'web',
                'company_id' => null,
            ],
            [
                'display_name' => 'مدير النظام',
                'description'  => 'صلاحيات كاملة على كل شيء',
            ]
        );

        $superAdmin->syncPermissions(Permission::whereNull('company_id')->get());

        $this->command?->info('✅ تم إعداد دور super-admin العالمي');
    }

    // ─────────────────────────────────────────────────────────────
    // 3. تعيين super-admin للمستخدم الأول
    // ─────────────────────────────────────────────────────────────

    private function assignSuperAdminUser(): void
    {
        $user = \App\Models\User::where('email', 'admin@mail.com')->first();

        if (!$user) {
            $this->command?->warn('⚠️  لم يُعثر على admin@mail.com — تخطي تعيين الدور');
            return;
        }

        $role = Role::where('name', 'super-admin')->whereNull('company_id')->first();

        if ($role) {
            $user->syncRoles([$role]);
            $this->command?->line('  ↳ super-admin ← admin@mail.com');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // قائمة الصلاحيات العالمية الشاملة
    // ─────────────────────────────────────────────────────────────

    private function getPermissions(): array
    {
        return [

            // ══════════════════════════════════════════════════════
            // 1. المستخدمون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_user',        'display_name' => 'عرض قائمة المستخدمين',      'group' => 'المستخدمون', 'description' => 'عرض قائمة جميع مستخدمي الشركة'],
            ['name' => 'view_user',            'display_name' => 'عرض مستخدم',                'group' => 'المستخدمون', 'description' => 'عرض تفاصيل مستخدم واحد'],
            ['name' => 'create_user',          'display_name' => 'إنشاء مستخدم',              'group' => 'المستخدمون', 'description' => 'إضافة مستخدم جديد للشركة'],
            ['name' => 'update_user',          'display_name' => 'تعديل مستخدم',              'group' => 'المستخدمون', 'description' => 'تعديل بيانات مستخدم موجود'],
            ['name' => 'delete_user',          'display_name' => 'حذف مستخدم',                'group' => 'المستخدمون', 'description' => 'حذف مستخدم من الشركة'],
            ['name' => 'restore_user',         'display_name' => 'استعادة مستخدم',            'group' => 'المستخدمون', 'description' => 'استعادة مستخدم محذوف'],
            ['name' => 'force_delete_user',    'display_name' => 'حذف نهائي لمستخدم',         'group' => 'المستخدمون', 'description' => 'الحذف النهائي لمستخدم'],
            ['name' => 'toggle_active_user',   'display_name' => 'تفعيل/تعطيل مستخدم',        'group' => 'المستخدمون', 'description' => 'تغيير حالة تفعيل المستخدم'],
            ['name' => 'change_password_user', 'display_name' => 'تغيير كلمة مرور مستخدم',    'group' => 'المستخدمون', 'description' => 'تغيير كلمة مرور مستخدم آخر'],
            ['name' => 'assign_role_user',     'display_name' => 'تعيين دور لمستخدم',         'group' => 'المستخدمون', 'description' => 'تغيير دور مستخدم داخل الشركة'],

            // ══════════════════════════════════════════════════════
            // 2. الأطراف (زبائن / موردون)
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_party',     'display_name' => 'عرض قائمة الأطراف',   'group' => 'الأطراف', 'description' => 'عرض قائمة العملاء والموردين'],
            ['name' => 'view_party',         'display_name' => 'عرض طرف',             'group' => 'الأطراف', 'description' => 'عرض تفاصيل عميل أو مورد'],
            ['name' => 'create_party',       'display_name' => 'إنشاء طرف',           'group' => 'الأطراف', 'description' => 'إضافة عميل أو مورد جديد'],
            ['name' => 'update_party',       'display_name' => 'تعديل طرف',           'group' => 'الأطراف', 'description' => 'تعديل بيانات عميل أو مورد'],
            ['name' => 'delete_party',       'display_name' => 'حذف طرف',             'group' => 'الأطراف', 'description' => 'حذف عميل أو مورد'],
            ['name' => 'restore_party',      'display_name' => 'استعادة طرف',         'group' => 'الأطراف', 'description' => 'استعادة عميل أو مورد محذوف'],
            ['name' => 'force_delete_party', 'display_name' => 'حذف نهائي لطرف',      'group' => 'الأطراف', 'description' => 'الحذف النهائي لعميل أو مورد'],

            // ══════════════════════════════════════════════════════
            // 3. المنتجات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_product',         'display_name' => 'عرض قائمة المنتجات',     'group' => 'المنتجات', 'description' => 'عرض قائمة جميع المنتجات'],
            ['name' => 'view_product',             'display_name' => 'عرض منتج',               'group' => 'المنتجات', 'description' => 'عرض تفاصيل منتج واحد'],
            ['name' => 'create_product',           'display_name' => 'إنشاء منتج',             'group' => 'المنتجات', 'description' => 'إضافة منتج جديد'],
            ['name' => 'update_product',           'display_name' => 'تعديل منتج',             'group' => 'المنتجات', 'description' => 'تعديل بيانات منتج موجود'],
            ['name' => 'delete_product',           'display_name' => 'حذف منتج',               'group' => 'المنتجات', 'description' => 'حذف منتج'],
            ['name' => 'restore_product',          'display_name' => 'استعادة منتج',           'group' => 'المنتجات', 'description' => 'استعادة منتج محذوف'],
            ['name' => 'manage_product_prices',    'display_name' => 'إدارة أسعار المنتجات',   'group' => 'المنتجات', 'description' => 'تعديل أسعار المنتجات'],
            ['name' => 'manage_product_variants',  'display_name' => 'إدارة متغيرات المنتجات', 'group' => 'المنتجات', 'description' => 'إدارة متغيرات المنتجات'],
            ['name' => 'manage_barcodes',          'display_name' => 'إدارة الباركود',          'group' => 'المنتجات', 'description' => 'إضافة وتعديل وحذف الباركود'],
            ['name' => 'manage_quantity_discounts','display_name' => 'إدارة تخفيضات الكميات',  'group' => 'المنتجات', 'description' => 'إدارة تخفيضات الكميات'],

            // ══════════════════════════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_warehouse',  'display_name' => 'عرض قائمة المستودعات', 'group' => 'المستودعات', 'description' => 'عرض قائمة جميع المستودعات'],
            ['name' => 'view_warehouse',      'display_name' => 'عرض مستودع',           'group' => 'المستودعات', 'description' => 'عرض تفاصيل مستودع'],
            ['name' => 'create_warehouse',    'display_name' => 'إنشاء مستودع',         'group' => 'المستودعات', 'description' => 'إضافة مستودع جديد'],
            ['name' => 'update_warehouse',    'display_name' => 'تعديل مستودع',         'group' => 'المستودعات', 'description' => 'تعديل بيانات مستودع'],
            ['name' => 'delete_warehouse',    'display_name' => 'حذف مستودع',           'group' => 'المستودعات', 'description' => 'حذف مستودع'],

            // ══════════════════════════════════════════════════════
            // 5. الفواتير والمستندات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_invoice',   'display_name' => 'عرض قائمة الفواتير',  'group' => 'الفواتير', 'description' => 'عرض قائمة الفواتير'],
            ['name' => 'view_invoice',       'display_name' => 'عرض فاتورة',          'group' => 'الفواتير', 'description' => 'عرض تفاصيل فاتورة'],
            ['name' => 'create_invoice',     'display_name' => 'إنشاء فاتورة',        'group' => 'الفواتير', 'description' => 'إنشاء فاتورة جديدة'],
            ['name' => 'update_invoice',     'display_name' => 'تعديل فاتورة',        'group' => 'الفواتير', 'description' => 'تعديل فاتورة موجودة'],
            ['name' => 'delete_invoice',     'display_name' => 'حذف فاتورة',          'group' => 'الفواتير', 'description' => 'حذف فاتورة'],
            ['name' => 'confirm_invoice',    'display_name' => 'اعتماد فاتورة',       'group' => 'الفواتير', 'description' => 'تأكيد واعتماد فاتورة'],
            ['name' => 'cancel_invoice',     'display_name' => 'إلغاء فاتورة',        'group' => 'الفواتير', 'description' => 'إلغاء فاتورة'],
            ['name' => 'print_invoice',      'display_name' => 'طباعة فاتورة',        'group' => 'الفواتير', 'description' => 'طباعة أو تصدير فاتورة'],

            // ══════════════════════════════════════════════════════
            // 6. المخزون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_inventory',    'display_name' => 'عرض المخزون',          'group' => 'المخزون', 'description' => 'عرض حركات المخزون'],
            ['name' => 'create_inventory',      'display_name' => 'إنشاء حركة مخزون',    'group' => 'المخزون', 'description' => 'إضافة حركة مخزون يدوية'],
            ['name' => 'adjust_inventory',      'display_name' => 'تعديل المخزون',        'group' => 'المخزون', 'description' => 'تعديل كميات المخزون'],
            ['name' => 'transfer_inventory',    'display_name' => 'نقل المخزون',          'group' => 'المخزون', 'description' => 'نقل مخزون بين المستودعات'],

            // ══════════════════════════════════════════════════════
            // 7. الخزينة والمدفوعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_treasury',   'display_name' => 'عرض الخزينة',             'group' => 'الخزينة', 'description' => 'عرض حسابات الخزينة'],
            ['name' => 'view_treasury',       'display_name' => 'عرض حساب خزينة',          'group' => 'الخزينة', 'description' => 'عرض تفاصيل حساب خزينة'],
            ['name' => 'create_treasury',     'display_name' => 'إنشاء حساب خزينة',        'group' => 'الخزينة', 'description' => 'إضافة حساب خزينة جديد'],
            ['name' => 'update_treasury',     'display_name' => 'تعديل حساب خزينة',        'group' => 'الخزينة', 'description' => 'تعديل حساب خزينة'],
            ['name' => 'delete_treasury',     'display_name' => 'حذف حساب خزينة',          'group' => 'الخزينة', 'description' => 'حذف حساب خزينة'],
            ['name' => 'view_any_payment',    'display_name' => 'عرض المدفوعات',           'group' => 'الخزينة', 'description' => 'عرض سجلات المدفوعات'],
            ['name' => 'create_payment',      'display_name' => 'تسجيل دفعة',              'group' => 'الخزينة', 'description' => 'تسجيل دفعة جديدة'],
            ['name' => 'delete_payment',      'display_name' => 'حذف دفعة',                'group' => 'الخزينة', 'description' => 'حذف دفعة مسجلة'],

            // ══════════════════════════════════════════════════════
            // 8. المصاريف
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_expense',   'display_name' => 'عرض المصاريف',     'group' => 'المصاريف', 'description' => 'عرض قائمة المصاريف'],
            ['name' => 'view_expense',       'display_name' => 'عرض مصروف',        'group' => 'المصاريف', 'description' => 'عرض تفاصيل مصروف'],
            ['name' => 'create_expense',     'display_name' => 'إنشاء مصروف',      'group' => 'المصاريف', 'description' => 'تسجيل مصروف جديد'],
            ['name' => 'update_expense',     'display_name' => 'تعديل مصروف',      'group' => 'المصاريف', 'description' => 'تعديل مصروف موجود'],
            ['name' => 'delete_expense',     'display_name' => 'حذف مصروف',        'group' => 'المصاريف', 'description' => 'حذف مصروف'],

            // ══════════════════════════════════════════════════════
            // 9. السنوات المالية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_fiscal_year',  'display_name' => 'عرض السنوات المالية',   'group' => 'السنة المالية', 'description' => 'عرض قائمة السنوات المالية'],
            ['name' => 'create_fiscal_year',    'display_name' => 'إنشاء سنة مالية',       'group' => 'السنة المالية', 'description' => 'إضافة سنة مالية جديدة'],
            ['name' => 'close_fiscal_year',     'display_name' => 'إقفال سنة مالية',       'group' => 'السنة المالية', 'description' => 'إقفال السنة المالية الحالية'],
            ['name' => 'reopen_fiscal_year',    'display_name' => 'إعادة فتح سنة مالية',   'group' => 'السنة المالية', 'description' => 'إعادة فتح سنة مالية مقفلة'],

            // ══════════════════════════════════════════════════════
            // 10. التقارير
            // ══════════════════════════════════════════════════════
            ['name' => 'view_reports',        'display_name' => 'عرض التقارير',          'group' => 'التقارير', 'description' => 'عرض التقارير العامة'],
            ['name' => 'view_financial_reports','display_name' => 'عرض التقارير المالية', 'group' => 'التقارير', 'description' => 'عرض التقارير المالية التفصيلية'],
            ['name' => 'export_reports',       'display_name' => 'تصدير التقارير',        'group' => 'التقارير', 'description' => 'تصدير التقارير إلى Excel/PDF'],

            // ══════════════════════════════════════════════════════
            // 11. الإعدادات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_settings',       'display_name' => 'عرض الإعدادات',         'group' => 'الإعدادات', 'description' => 'عرض إعدادات الشركة'],
            ['name' => 'update_company',      'display_name' => 'تعديل إعدادات الشركة',  'group' => 'الإعدادات', 'description' => 'تعديل البيانات والإعدادات'],
            ['name' => 'manage_lookups',      'display_name' => 'إدارة بيانات المرجع',   'group' => 'الإعدادات', 'description' => 'إدارة الوحدات والعملات وأنواع المستندات'],
            ['name' => 'manage_roles',        'display_name' => 'إدارة الأدوار',          'group' => 'الإعدادات', 'description' => 'إنشاء وتعديل أدوار الشركة'],

            // ══════════════════════════════════════════════════════
            // 12. نقطة البيع (POS)
            // ══════════════════════════════════════════════════════
            ['name' => 'access_pos',          'display_name' => 'الوصول لنقطة البيع',    'group' => 'POS', 'description' => 'استخدام شاشة نقطة البيع'],
            ['name' => 'apply_discount_pos',  'display_name' => 'منح تخفيض في POS',      'group' => 'POS', 'description' => 'تطبيق تخفيض يدوي في نقطة البيع'],
            ['name' => 'open_drawer_pos',     'display_name' => 'فتح درج الكاش',         'group' => 'POS', 'description' => 'فتح درج الكاش يدوياً'],
        ];
    }
}
