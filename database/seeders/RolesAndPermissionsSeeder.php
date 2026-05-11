<?php

namespace Database\Seeders;

use App\Services\CompanyRoleService;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * RolesAndPermissionsSeeder
 * ══════════════════════════════════════════════════════════════════
 * مسؤول عن:
 *  1. إنشاء جميع الصلاحيات العالمية (company_id = null)
 *  2. إنشاء دور super-admin العالمي ومنحه كل الصلاحيات
 *  3. بذر أدوار الشركة الأولى (seed) عبر CompanyRoleService
 *  4. تعيين الأدوار للمستخدمين الأوليين
 *
 * ملاحظة: عند إنشاء شركة جديدة يتم استدعاء CompanyRoleService
 *          تلقائياً من CompanyObserver::created()
 * ══════════════════════════════════════════════════════════════════
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function run(): void
    {
        $companyId = config('seeding.company_id');

        // مسح الكاش أولاً
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // ── الخطوة 1: إنشاء الصلاحيات العالمية ──────────────────
        $this->seedPermissions();

        // ── الخطوة 2: إنشاء دور super-admin العالمي ──────────────
        $this->seedSuperAdmin();

        // ── الخطوة 3: بذر أدوار الشركة الأولى ───────────────────
        $this->roleService->seedRoles($companyId);
        $this->command->info("✅ تم إنشاء أدوار الشركة #{$companyId}");

        // ── الخطوة 4: تعيين الأدوار للمستخدمين الأوليين ──────────
        $this->assignInitialUsers($companyId);

        // مسح الكاش في النهاية
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command->info('🎉 اكتمل الـ Seeder بنجاح!');
    }

    // ─────────────────────────────────────────────────────────────

    private function seedPermissions(): void
    {
        foreach ($this->getPermissions() as $perm) {
            Permission::firstOrCreate(
                [
                    'name'       => $perm['name'],
                    'guard_name' => 'web',
                    'company_id' => null,          // عالمية دائماً
                ],
                [
                    'display_name' => $perm['display_name'] ?? $perm['name'],
                    'group'        => $perm['group']        ?? 'عام',
                    'description'  => $perm['description']  ?? '',
                ]
            );
        }

        $this->command->info('✅ تم إنشاء ' . Permission::whereNull('company_id')->count() . ' صلاحية');
    }

    private function seedSuperAdmin(): void
    {
        $superAdmin = Role::firstOrCreate(
            [
                'name'       => 'super-admin',
                'guard_name' => 'web',
                'company_id' => null,             // عالمي
            ],
            [
                'display_name' => 'مدير النظام',
                'description'  => 'صلاحيات كاملة على كل شيء',
            ]
        );

        // super-admin يحصل على كل الصلاحيات العالمية دائماً
        $superAdmin->syncPermissions(Permission::whereNull('company_id')->get());

        $this->command->info('✅ تم إعداد دور super-admin');
    }

    private function assignInitialUsers(int $companyId): void
    {
        // المستخدم العالمي (super-admin)
        $superAdminUser = \App\Models\User::where('email', 'admin@mail.com')->first();
        if ($superAdminUser) {
            $superAdminRole = Role::where('name', 'super-admin')->whereNull('company_id')->first();
            $superAdminUser->syncRoles([$superAdminRole]);
            $this->command->line('  ↳ super-admin: admin@mail.com');
        }

        // مدير الشركة الأولى
        $adminUser = \App\Models\User::where('email', 'admin.user@mail.com')->first();
        if ($adminUser) {
            $this->roleService->assignRole($adminUser, 'admin', $companyId);
            $this->command->line('  ↳ admin: admin.user@mail.com');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // قائمة الصلاحيات العالمية
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
            // 2. الأطراف
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
            ['name' => 'view_any_product',        'display_name' => 'عرض قائمة المنتجات',      'group' => 'المنتجات', 'description' => 'عرض قائمة جميع المنتجات'],
            ['name' => 'view_product',            'display_name' => 'عرض منتج',                'group' => 'المنتجات', 'description' => 'عرض تفاصيل منتج واحد'],
            ['name' => 'create_product',          'display_name' => 'إنشاء منتج',              'group' => 'المنتجات', 'description' => 'إضافة منتج جديد'],
            ['name' => 'update_product',          'display_name' => 'تعديل منتج',              'group' => 'المنتجات', 'description' => 'تعديل بيانات منتج موجود'],
            ['name' => 'delete_product',          'display_name' => 'حذف منتج',                'group' => 'المنتجات', 'description' => 'حذف منتج'],
            ['name' => 'restore_product',         'display_name' => 'استعادة منتج',            'group' => 'المنتجات', 'description' => 'استعادة منتج محذوف'],
            ['name' => 'manage_product_prices',   'display_name' => 'إدارة أسعار المنتجات',    'group' => 'المنتجات', 'description' => 'تعديل أسعار المنتجات وتعريفاتها'],
            ['name' => 'manage_product_variants', 'display_name' => 'إدارة متغيرات المنتجات',  'group' => 'المنتجات', 'description' => 'إدارة متغيرات وتعبئة المنتجات'],
            ['name' => 'manage_barcodes',         'display_name' => 'إدارة الباركود',           'group' => 'المنتجات', 'description' => 'إضافة وتعديل وحذف الباركود'],
            ['name' => 'manage_quantity_discounts','display_name' => 'إدارة تخفيضات الكميات',  'group' => 'المنتجات', 'description' => 'إدارة تخفيضات الكميات للمنتجات'],

            // ══════════════════════════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_warehouse', 'display_name' => 'عرض قائمة المستودعات', 'group' => 'المستودعات', 'description' => 'عرض قائمة جميع المستودعات'],
            ['name' => 'view_warehouse',     'display_name' => 'عرض مستودع',           'group' => 'المستودعات', 'description' => 'عرض تفاصيل مستودع'],
            ['name' => 'create_warehouse',   'display_name' => 'إنشاء مستودع',         'group' => 'المستودعات', 'description' => 'إضافة مستودع جديد'],
            ['name' => 'update_warehouse',   'display_name' => 'تعديل مستودع',         'group' => 'المستودعات', 'description' => 'تعديل بيانات مستودع'],
            ['name' => 'delete_warehouse',   'display_name' => 'حذف مستودع',           'group' => 'المستودعات', 'description' => 'حذف مستودع'],

            // ══════════════════════════════════════════════════════
            // 5. المستندات التجارية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_commercial_document',  'display_name' => 'عرض قائمة المستندات',   'group' => 'المستندات', 'description' => 'عرض قائمة جميع المستندات التجارية'],
            ['name' => 'view_commercial_document',      'display_name' => 'عرض مستند',             'group' => 'المستندات', 'description' => 'عرض تفاصيل مستند تجاري'],
            ['name' => 'create_sales_document',         'display_name' => 'إنشاء مستند بيع',       'group' => 'المستندات', 'description' => 'إنشاء فاتورة بيع أو عرض سعر'],
            ['name' => 'create_purchase_document',      'display_name' => 'إنشاء مستند شراء',      'group' => 'المستندات', 'description' => 'إنشاء فاتورة شراء أو أمر شراء'],
            ['name' => 'update_commercial_document',    'display_name' => 'تعديل مستند',           'group' => 'المستندات', 'description' => 'تعديل مستند تجاري غير مؤكد'],
            ['name' => 'delete_commercial_document',    'display_name' => 'حذف مستند',             'group' => 'المستندات', 'description' => 'حذف مستند تجاري'],
            ['name' => 'validate_commercial_document',  'display_name' => 'تأكيد مستند',           'group' => 'المستندات', 'description' => 'تأكيد وإقفال مستند تجاري'],
            ['name' => 'lock_commercial_document',      'display_name' => 'قفل/فتح مستند',         'group' => 'المستندات', 'description' => 'قفل أو فتح مستند تجاري'],
            ['name' => 'cancel_commercial_document',    'display_name' => 'إلغاء مستند',           'group' => 'المستندات', 'description' => 'إلغاء مستند تجاري'],
            ['name' => 'duplicate_commercial_document', 'display_name' => 'نسخ مستند',             'group' => 'المستندات', 'description' => 'نسخ مستند تجاري موجود'],
            ['name' => 'manage_numbering_series',       'display_name' => 'إدارة سلاسل الترقيم',   'group' => 'المستندات', 'description' => 'إدارة سلاسل ترقيم المستندات'],

            // ══════════════════════════════════════════════════════
            // 6. المدفوعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_payment', 'display_name' => 'عرض قائمة المدفوعات', 'group' => 'المدفوعات', 'description' => 'عرض قائمة جميع المدفوعات'],
            ['name' => 'view_payment',     'display_name' => 'عرض دفعة',            'group' => 'المدفوعات', 'description' => 'عرض تفاصيل دفعة واحدة'],
            ['name' => 'create_payment',   'display_name' => 'إنشاء دفعة',          'group' => 'المدفوعات', 'description' => 'تسجيل دفعة جديدة'],
            ['name' => 'update_payment',   'display_name' => 'تعديل دفعة',          'group' => 'المدفوعات', 'description' => 'تعديل بيانات دفعة'],
            ['name' => 'delete_payment',   'display_name' => 'حذف دفعة',            'group' => 'المدفوعات', 'description' => 'حذف دفعة'],

            // ══════════════════════════════════════════════════════
            // 7. الشيكات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_check',     'display_name' => 'عرض قائمة الشيكات',  'group' => 'الشيكات', 'description' => 'عرض قائمة جميع الشيكات'],
            ['name' => 'view_check',         'display_name' => 'عرض شيك',            'group' => 'الشيكات', 'description' => 'عرض تفاصيل شيك'],
            ['name' => 'create_check',       'display_name' => 'إنشاء شيك',          'group' => 'الشيكات', 'description' => 'تسجيل شيك جديد'],
            ['name' => 'update_check',       'display_name' => 'تعديل شيك',          'group' => 'الشيكات', 'description' => 'تعديل بيانات شيك'],
            ['name' => 'delete_check',       'display_name' => 'حذف شيك',            'group' => 'الشيكات', 'description' => 'حذف شيك'],
            ['name' => 'manage_check_status','display_name' => 'إدارة حالة الشيكات', 'group' => 'الشيكات', 'description' => 'تحديث حالة الشيك (صُرف/مرتجع...)'],

            // ══════════════════════════════════════════════════════
            // 8. المصروفات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_expense', 'display_name' => 'عرض قائمة المصروفات', 'group' => 'المصروفات', 'description' => 'عرض قائمة جميع المصروفات'],
            ['name' => 'view_expense',     'display_name' => 'عرض مصروف',           'group' => 'المصروفات', 'description' => 'عرض تفاصيل مصروف'],
            ['name' => 'create_expense',   'display_name' => 'إنشاء مصروف',         'group' => 'المصروفات', 'description' => 'تسجيل مصروف جديد'],
            ['name' => 'update_expense',   'display_name' => 'تعديل مصروف',         'group' => 'المصروفات', 'description' => 'تعديل بيانات مصروف'],
            ['name' => 'delete_expense',   'display_name' => 'حذف مصروف',           'group' => 'المصروفات', 'description' => 'حذف مصروف'],

            // ══════════════════════════════════════════════════════
            // 9. الخزينة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_treasury_account', 'display_name' => 'عرض حسابات الخزينة',    'group' => 'الخزينة', 'description' => 'عرض قائمة جميع حسابات الخزينة والبنوك'],
            ['name' => 'view_treasury_account',     'display_name' => 'عرض حساب خزينة',        'group' => 'الخزينة', 'description' => 'عرض تفاصيل حساب خزينة'],
            ['name' => 'create_treasury_account',   'display_name' => 'إنشاء حساب خزينة',      'group' => 'الخزينة', 'description' => 'إضافة حساب خزينة أو بنك جديد'],
            ['name' => 'update_treasury_account',   'display_name' => 'تعديل حساب خزينة',      'group' => 'الخزينة', 'description' => 'تعديل بيانات حساب خزينة'],
            ['name' => 'delete_treasury_account',   'display_name' => 'حذف حساب خزينة',        'group' => 'الخزينة', 'description' => 'حذف حساب خزينة'],

            // ══════════════════════════════════════════════════════
            // 10. المخزون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_stock_movement', 'display_name' => 'عرض حركات المخزون',       'group' => 'المخزون', 'description' => 'عرض قائمة حركات المخزون'],
            ['name' => 'view_stock_movement',     'display_name' => 'عرض حركة مخزون',         'group' => 'المخزون', 'description' => 'عرض تفاصيل حركة مخزون'],
            ['name' => 'create_stock_movement',   'display_name' => 'إنشاء حركة مخزون',       'group' => 'المخزون', 'description' => 'تسجيل حركة مخزون يدوية'],
            ['name' => 'delete_stock_movement',   'display_name' => 'حذف حركة مخزون',         'group' => 'المخزون', 'description' => 'حذف حركة مخزون'],
            ['name' => 'view_any_product_lot',    'display_name' => 'عرض دفعات المنتجات',     'group' => 'المخزون', 'description' => 'عرض قائمة دفعات المنتجات'],
            ['name' => 'manage_product_lot',      'display_name' => 'إدارة دفعات المنتجات',   'group' => 'المخزون', 'description' => 'إضافة وتعديل وحذف دفعات المنتجات'],
            ['name' => 'manage_opening_balances', 'display_name' => 'إدارة الأرصدة الافتتاحية','group' => 'المخزون', 'description' => 'إدارة أرصدة المخزون والأطراف الافتتاحية'],

            // ══════════════════════════════════════════════════════
            // 11. الموظفون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_employee',           'display_name' => 'عرض قائمة الموظفين', 'group' => 'الموظفون', 'description' => 'عرض قائمة جميع الموظفين'],
            ['name' => 'view_employee',               'display_name' => 'عرض موظف',           'group' => 'الموظفون', 'description' => 'عرض تفاصيل موظف'],
            ['name' => 'create_employee',             'display_name' => 'إنشاء موظف',         'group' => 'الموظفون', 'description' => 'إضافة موظف جديد'],
            ['name' => 'update_employee',             'display_name' => 'تعديل موظف',         'group' => 'الموظفون', 'description' => 'تعديل بيانات موظف'],
            ['name' => 'delete_employee',             'display_name' => 'حذف موظف',           'group' => 'الموظفون', 'description' => 'حذف موظف'],
            ['name' => 'manage_employment_contracts', 'display_name' => 'إدارة عقود العمل',   'group' => 'الموظفون', 'description' => 'إدارة عقود عمل الموظفين'],

            // ══════════════════════════════════════════════════════
            // 12. التقارير
            // ══════════════════════════════════════════════════════
            ['name' => 'view_sales_report',     'display_name' => 'تقرير المبيعات',   'group' => 'التقارير', 'description' => 'عرض تقارير المبيعات'],
            ['name' => 'view_purchase_report',  'display_name' => 'تقرير المشتريات',  'group' => 'التقارير', 'description' => 'عرض تقارير المشتريات'],
            ['name' => 'view_inventory_report', 'display_name' => 'تقرير المخزون',    'group' => 'التقارير', 'description' => 'عرض تقارير المخزون والحركات'],
            ['name' => 'view_financial_report', 'display_name' => 'التقارير المالية', 'group' => 'التقارير', 'description' => 'عرض التقارير المالية'],
            ['name' => 'view_party_report',     'display_name' => 'تقارير الأطراف',   'group' => 'التقارير', 'description' => 'عرض تقارير العملاء والموردين'],
            ['name' => 'view_dashboard',        'display_name' => 'عرض لوحة التحكم', 'group' => 'التقارير', 'description' => 'الوصول للوحة التحكم والإحصاءات العامة'],

            // ══════════════════════════════════════════════════════
            // 13. السنوات المالية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_fiscal_year', 'display_name' => 'عرض السنوات المالية', 'group' => 'السنوات المالية', 'description' => 'عرض قائمة السنوات المالية'],
            ['name' => 'manage_fiscal_year',   'display_name' => 'إدارة السنوات المالية','group' => 'السنوات المالية', 'description' => 'إنشاء وتعديل وإقفال السنوات المالية'],

            // ══════════════════════════════════════════════════════
            // 14. الإعدادات
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_settings',    'display_name' => 'إدارة الإعدادات',     'group' => 'الإعدادات', 'description' => 'تعديل إعدادات الشركة العامة'],
            ['name' => 'manage_lookups',     'display_name' => 'إدارة جداول البحث',   'group' => 'الإعدادات', 'description' => 'إدارة العملات، الوحدات، إلخ'],
            ['name' => 'manage_attachments', 'display_name' => 'إدارة المرفقات',      'group' => 'الإعدادات', 'description' => 'رفع وحذف المرفقات'],
            ['name' => 'view_audit_log',     'display_name' => 'عرض سجل المراجعة',   'group' => 'الإعدادات', 'description' => 'عرض سجل العمليات والتعديلات'],

            // ══════════════════════════════════════════════════════
            // 15. الأدوار
            // ══════════════════════════════════════════════════════
            ['name' => 'view_roles',   'display_name' => 'عرض الأدوار',   'group' => 'الأدوار', 'description' => 'عرض الأدوار والصلاحيات المرتبطة'],
            ['name' => 'manage_roles', 'display_name' => 'إدارة الأدوار', 'group' => 'الأدوار', 'description' => 'إنشاء وتعديل وحذف الأدوار وصلاحياتها'],

            // ══════════════════════════════════════════════════════
            // 16. الشركة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_company',           'display_name' => 'عرض الشركة',         'group' => 'الشركة', 'description' => 'عرض بيانات الشركة الحالية'],
            ['name' => 'update_company',         'display_name' => 'تعديل الشركة',        'group' => 'الشركة', 'description' => 'تعديل بيانات الشركة الأساسية'],
            ['name' => 'manage_company_members', 'display_name' => 'إدارة أعضاء الشركة', 'group' => 'الشركة', 'description' => 'إضافة وإزالة الأعضاء وتغيير أدوارهم'],
            ['name' => 'transfer_ownership',     'display_name' => 'نقل ملكية الشركة',   'group' => 'الشركة', 'description' => 'نقل ملكية الشركة لمستخدم آخر'],

            // ══════════════════════════════════════════════════════
            // 17. التنبيهات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_notification', 'display_name' => 'عرض التنبيهات',  'group' => 'التنبيهات', 'description' => 'عرض قائمة التنبيهات'],
            ['name' => 'manage_notifications',  'display_name' => 'إدارة التنبيهات', 'group' => 'التنبيهات', 'description' => 'إدارة وحذف التنبيهات'],

            // ══════════════════════════════════════════════════════
            // 18. جداول البحث (Lookups)
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_currency',  'display_name' => 'عرض العملات',   'group' => 'جداول البحث'],
            ['name' => 'create_currency',    'display_name' => 'إنشاء عملة',    'group' => 'جداول البحث'],
            ['name' => 'update_currency',    'display_name' => 'تعديل عملة',    'group' => 'جداول البحث'],
            ['name' => 'delete_currency',    'display_name' => 'حذف عملة',      'group' => 'جداول البحث'],

            ['name' => 'view_any_tva',  'display_name' => 'عرض TVA',   'group' => 'جداول البحث'],
            ['name' => 'create_tva',    'display_name' => 'إنشاء TVA', 'group' => 'جداول البحث'],
            ['name' => 'update_tva',    'display_name' => 'تعديل TVA', 'group' => 'جداول البحث'],
            ['name' => 'delete_tva',    'display_name' => 'حذف TVA',   'group' => 'جداول البحث'],

            ['name' => 'view_any_unit', 'display_name' => 'عرض الوحدات', 'group' => 'جداول البحث'],
            ['name' => 'create_unit',   'display_name' => 'إنشاء وحدة',  'group' => 'جداول البحث'],
            ['name' => 'update_unit',   'display_name' => 'تعديل وحدة',  'group' => 'جداول البحث'],
            ['name' => 'delete_unit',   'display_name' => 'حذف وحدة',    'group' => 'جداول البحث'],

            ['name' => 'view_any_family', 'display_name' => 'عرض العائلات', 'group' => 'جداول البحث'],
            ['name' => 'create_family',   'display_name' => 'إنشاء عائلة',  'group' => 'جداول البحث'],
            ['name' => 'update_family',   'display_name' => 'تعديل عائلة',  'group' => 'جداول البحث'],
            ['name' => 'delete_family',   'display_name' => 'حذف عائلة',    'group' => 'جداول البحث'],

            ['name' => 'view_any_brand', 'display_name' => 'عرض العلامات التجارية', 'group' => 'جداول البحث'],
            ['name' => 'create_brand',   'display_name' => 'إنشاء علامة تجارية',    'group' => 'جداول البحث'],
            ['name' => 'update_brand',   'display_name' => 'تعديل علامة تجارية',    'group' => 'جداول البحث'],
            ['name' => 'delete_brand',   'display_name' => 'حذف علامة تجارية',      'group' => 'جداول البحث'],

            ['name' => 'view_any_price_level', 'display_name' => 'عرض مستويات الأسعار', 'group' => 'جداول البحث'],
            ['name' => 'create_price_level',   'display_name' => 'إنشاء مستوى سعر',     'group' => 'جداول البحث'],
            ['name' => 'update_price_level',   'display_name' => 'تعديل مستوى سعر',     'group' => 'جداول البحث'],
            ['name' => 'delete_price_level',   'display_name' => 'حذف مستوى سعر',       'group' => 'جداول البحث'],

            ['name' => 'view_any_payment_mode', 'display_name' => 'عرض طرق الدفع',   'group' => 'جداول البحث'],
            ['name' => 'create_payment_mode',   'display_name' => 'إنشاء طريقة دفع', 'group' => 'جداول البحث'],
            ['name' => 'update_payment_mode',   'display_name' => 'تعديل طريقة دفع', 'group' => 'جداول البحث'],
            ['name' => 'delete_payment_mode',   'display_name' => 'حذف طريقة دفع',   'group' => 'جداول البحث'],

            ['name' => 'view_any_expense_category', 'display_name' => 'عرض فئات المصروفات', 'group' => 'جداول البحث'],
            ['name' => 'create_expense_category',   'display_name' => 'إنشاء فئة مصروفات',  'group' => 'جداول البحث'],
            ['name' => 'update_expense_category',   'display_name' => 'تعديل فئة مصروفات',  'group' => 'جداول البحث'],
            ['name' => 'delete_expense_category',   'display_name' => 'حذف فئة مصروفات',    'group' => 'جداول البحث'],

            ['name' => 'view_any_exchange_rate', 'display_name' => 'عرض أسعار الصرف', 'group' => 'جداول البحث'],
            ['name' => 'create_exchange_rate',   'display_name' => 'إنشاء سعر صرف',   'group' => 'جداول البحث'],
            ['name' => 'update_exchange_rate',   'display_name' => 'تعديل سعر صرف',   'group' => 'جداول البحث'],
            ['name' => 'delete_exchange_rate',   'display_name' => 'حذف سعر صرف',     'group' => 'جداول البحث'],

            ['name' => 'view_any_document_type', 'display_name' => 'عرض أنواع المستندات', 'group' => 'جداول البحث'],
            ['name' => 'create_document_type',   'display_name' => 'إنشاء نوع مستند',     'group' => 'جداول البحث'],
            ['name' => 'update_document_type',   'display_name' => 'تعديل نوع مستند',     'group' => 'جداول البحث'],
            ['name' => 'delete_document_type',   'display_name' => 'حذف نوع مستند',       'group' => 'جداول البحث'],

            ['name' => 'view_any_document_status', 'display_name' => 'عرض حالات المستندات', 'group' => 'جداول البحث'],
            ['name' => 'create_document_status',   'display_name' => 'إنشاء حالة مستند',    'group' => 'جداول البحث'],
            ['name' => 'update_document_status',   'display_name' => 'تعديل حالة مستند',    'group' => 'جداول البحث'],
            ['name' => 'delete_document_status',   'display_name' => 'حذف حالة مستند',      'group' => 'جداول البحث'],

            ['name' => 'view_any_gender', 'display_name' => 'عرض الجنسين', 'group' => 'جداول البحث'],
            ['name' => 'create_gender',   'display_name' => 'إنشاء جنس',   'group' => 'جداول البحث'],
            ['name' => 'update_gender',   'display_name' => 'تعديل جنس',   'group' => 'جداول البحث'],
            ['name' => 'delete_gender',   'display_name' => 'حذف جنس',     'group' => 'جداول البحث'],

            ['name' => 'view_any_legal_form', 'display_name' => 'عرض الأشكال القانونية', 'group' => 'جداول البحث'],
            ['name' => 'create_legal_form',   'display_name' => 'إنشاء شكل قانوني',      'group' => 'جداول البحث'],
            ['name' => 'update_legal_form',   'display_name' => 'تعديل شكل قانوني',      'group' => 'جداول البحث'],
            ['name' => 'delete_legal_form',   'display_name' => 'حذف شكل قانوني',        'group' => 'جداول البحث'],

            ['name' => 'view_any_party_type', 'display_name' => 'عرض أنواع الأطراف', 'group' => 'جداول البحث'],
            ['name' => 'create_party_type',   'display_name' => 'إنشاء نوع طرف',     'group' => 'جداول البحث'],
            ['name' => 'update_party_type',   'display_name' => 'تعديل نوع طرف',     'group' => 'جداول البحث'],
            ['name' => 'delete_party_type',   'display_name' => 'حذف نوع طرف',       'group' => 'جداول البحث'],

            ['name' => 'view_any_product_type', 'display_name' => 'عرض أنواع المنتجات', 'group' => 'جداول البحث'],
            ['name' => 'create_product_type',   'display_name' => 'إنشاء نوع منتج',     'group' => 'جداول البحث'],
            ['name' => 'update_product_type',   'display_name' => 'تعديل نوع منتج',     'group' => 'جداول البحث'],
            ['name' => 'delete_product_type',   'display_name' => 'حذف نوع منتج',       'group' => 'جداول البحث'],

            ['name' => 'view_any_treasury_account_type', 'display_name' => 'عرض أنواع حسابات الخزينة', 'group' => 'جداول البحث'],
            ['name' => 'create_treasury_account_type',   'display_name' => 'إنشاء نوع حساب خزينة',     'group' => 'جداول البحث'],
            ['name' => 'update_treasury_account_type',   'display_name' => 'تعديل نوع حساب خزينة',     'group' => 'جداول البحث'],
            ['name' => 'delete_treasury_account_type',   'display_name' => 'حذف نوع حساب خزينة',       'group' => 'جداول البحث'],

            ['name' => 'view_any_stock_movement_type', 'display_name' => 'عرض أنواع حركات المخزون', 'group' => 'جداول البحث'],
            ['name' => 'create_stock_movement_type',   'display_name' => 'إنشاء نوع حركة مخزون',    'group' => 'جداول البحث'],
            ['name' => 'update_stock_movement_type',   'display_name' => 'تعديل نوع حركة مخزون',    'group' => 'جداول البحث'],
            ['name' => 'delete_stock_movement_type',   'display_name' => 'حذف نوع حركة مخزون',      'group' => 'جداول البحث'],

            ['name' => 'view_any_inventory_valuation_method', 'display_name' => 'عرض طرق تقييم المخزون', 'group' => 'جداول البحث'],
            ['name' => 'create_inventory_valuation_method',   'display_name' => 'إنشاء طريقة تقييم',     'group' => 'جداول البحث'],
            ['name' => 'update_inventory_valuation_method',   'display_name' => 'تعديل طريقة تقييم',     'group' => 'جداول البحث'],
            ['name' => 'delete_inventory_valuation_method',   'display_name' => 'حذف طريقة تقييم',       'group' => 'جداول البحث'],
        ];
    }
}
