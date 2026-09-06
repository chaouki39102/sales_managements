<?php

namespace Database\Seeders;

use App\Services\CompanyRoleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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
 * ✅ الإصلاح: يقرأ company_id من config أو يأخذ أول شركة تلقائياً
 * ══════════════════════════════════════════════════════════════════
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function run(): void
    {
        // ✅ الإصلاح: fallback لأول شركة موجودة إذا لم يُحدَّد config
        $companyId = config('seeding.company_id')
            ?? DB::table('companies')->value('id');

        if (!$companyId) {
            $this->command?->warn('⚠️  لا توجد شركات في قاعدة البيانات — سيتم إنشاء الصلاحيات فقط');
        }

        // مسح الكاش أولاً
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // ── الخطوة 1: إنشاء الصلاحيات العالمية ──────────────────
        $this->seedPermissions();

        // ── الخطوة 2: إنشاء دور super-admin العالمي ──────────────
        $this->seedSuperAdmin();

        // ── الخطوة 3: بذر أدوار الشركة الأولى فقط ───────────────
        // (بقية الشركات لها أدوار من CompanyObserver — نحتاج syncPermissions فقط)
        if ($companyId) {
            $this->roleService->seedRoles($companyId);
            $this->command?->info("✅ تم إنشاء/تحديث أدوار الشركة #{$companyId}");

            // ── الخطوة 3b: تحديث صلاحيات الشركات الأخرى الموجودة ─
            $otherCompanyIds = DB::table('companies')
                ->where('id', '!=', $companyId)
                ->pluck('id');

            foreach ($otherCompanyIds as $id) {
                $this->roleService->seedRoles($id);
            }

            if ($otherCompanyIds->isNotEmpty()) {
                $this->command?->info("✅ تم تحديث أدوار {$otherCompanyIds->count()} شركة أخرى");
            }
        }

        // ── الخطوة 4: تعيين الأدوار للمستخدمين الأوليين ──────────
        if ($companyId) {
            $this->assignInitialUsers($companyId);
        }

        // مسح الكاش في النهاية
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command?->info('🎉 اكتمل الـ Seeder بنجاح!');
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

        $count = Permission::whereNull('company_id')->count();
        $this->command?->info("✅ تم إنشاء {$count} صلاحية عالمية");
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

        $this->command?->info('✅ تم إعداد دور super-admin');
    }

    private function assignInitialUsers(int $companyId): void
    {
        // المستخدم العالمي (super-admin)
        $superAdminUser = \App\Models\User::where('email', env('SUPER_ADMIN_EMAIL', 'admin@mail.com'))->first();
        if ($superAdminUser) {
            $superAdminRole = Role::where('name', 'super-admin')->whereNull('company_id')->first();
            if ($superAdminRole) {
                $superAdminUser->syncRoles([$superAdminRole]);
                $this->command?->line('  ↳ super-admin: ' . $superAdminUser->email);
            }
        }

        // مالك الشركة الأولى (اختياري — إذا وجد)
        $adminEmail = env('ADMIN_USER_EMAIL', 'admin.user@mail.com');
        $adminUser  = \App\Models\User::where('email', $adminEmail)->first();
        if ($adminUser) {
            $this->roleService->assignRole($adminUser, 'owner', $companyId);
            $this->command?->line('  ↳ owner: ' . $adminUser->email);
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
            ['name' => 'view_any_party',     'display_name' => 'عرض قائمة الأطراف',   'group' => 'الأطراف', 'description' => 'عرض قائمة الزبائن والموردين'],
            ['name' => 'view_party',         'display_name' => 'عرض طرف',             'group' => 'الأطراف', 'description' => 'عرض تفاصيل زبون أو مورد'],
            ['name' => 'create_party',       'display_name' => 'إنشاء طرف',           'group' => 'الأطراف', 'description' => 'إضافة زبون أو مورد جديد'],
            ['name' => 'update_party',       'display_name' => 'تعديل طرف',           'group' => 'الأطراف', 'description' => 'تعديل بيانات زبون أو مورد'],
            ['name' => 'delete_party',       'display_name' => 'حذف طرف',             'group' => 'الأطراف', 'description' => 'حذف زبون أو مورد'],
            ['name' => 'restore_party',      'display_name' => 'استعادة طرف',         'group' => 'الأطراف', 'description' => 'استعادة زبون أو مورد محذوف'],
            ['name' => 'force_delete_party', 'display_name' => 'حذف نهائي لطرف',      'group' => 'الأطراف', 'description' => 'الحذف النهائي لزبون أو مورد'],

            // ══════════════════════════════════════════════════════
            // 3. المنتجات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_product',        'display_name' => 'عرض قائمة المنتجات',      'group' => 'المنتجات'],
            ['name' => 'view_product',            'display_name' => 'عرض منتج',                'group' => 'المنتجات'],
            ['name' => 'create_product',          'display_name' => 'إنشاء منتج',              'group' => 'المنتجات'],
            ['name' => 'update_product',          'display_name' => 'تعديل منتج',              'group' => 'المنتجات'],
            ['name' => 'delete_product',          'display_name' => 'حذف منتج',                'group' => 'المنتجات'],
            ['name' => 'restore_product',         'display_name' => 'استعادة منتج',            'group' => 'المنتجات'],
            ['name' => 'manage_product_prices',   'display_name' => 'إدارة أسعار المنتجات',    'group' => 'المنتجات'],
            ['name' => 'manage_product_variants', 'display_name' => 'إدارة متغيرات المنتجات',  'group' => 'المنتجات'],
            ['name' => 'manage_barcodes',         'display_name' => 'إدارة الباركود',           'group' => 'المنتجات'],
            ['name' => 'manage_quantity_discounts','display_name' => 'إدارة تخفيضات الكميات',  'group' => 'المنتجات'],

            // ══════════════════════════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_warehouse', 'display_name' => 'عرض قائمة المستودعات', 'group' => 'المستودعات'],
            ['name' => 'view_warehouse',     'display_name' => 'عرض مستودع',           'group' => 'المستودعات'],
            ['name' => 'create_warehouse',   'display_name' => 'إنشاء مستودع',         'group' => 'المستودعات'],
            ['name' => 'update_warehouse',   'display_name' => 'تعديل مستودع',         'group' => 'المستودعات'],
            ['name' => 'delete_warehouse',   'display_name' => 'حذف مستودع',           'group' => 'المستودعات'],

            // ══════════════════════════════════════════════════════
            // 5. المستندات التجارية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_commercial_document',  'display_name' => 'عرض قائمة المستندات',   'group' => 'المستندات'],
            ['name' => 'view_commercial_document',      'display_name' => 'عرض مستند',             'group' => 'المستندات'],
            ['name' => 'create_sales_document',         'display_name' => 'إنشاء مستند بيع',       'group' => 'المستندات'],
            ['name' => 'create_purchase_document',      'display_name' => 'إنشاء مستند شراء',      'group' => 'المستندات'],
            ['name' => 'update_commercial_document',    'display_name' => 'تعديل مستند',           'group' => 'المستندات'],
            ['name' => 'delete_commercial_document',    'display_name' => 'حذف مستند',             'group' => 'المستندات'],
            ['name' => 'validate_commercial_document',  'display_name' => 'تأكيد مستند',           'group' => 'المستندات'],
            ['name' => 'lock_commercial_document',      'display_name' => 'قفل/فتح مستند',         'group' => 'المستندات'],
            ['name' => 'cancel_commercial_document',    'display_name' => 'إلغاء مستند',           'group' => 'المستندات'],
            ['name' => 'duplicate_commercial_document', 'display_name' => 'نسخ مستند',             'group' => 'المستندات'],
            ['name' => 'manage_numbering_series',       'display_name' => 'إدارة سلاسل الترقيم',   'group' => 'المستندات'],

            // الصلاحيات الدقيقة للمستندات (المهمة 3 — ترقية محرر المستندات)
            ['name' => 'create_commercial_document',         'display_name' => 'إنشاء مستند',             'group' => 'المستندات', 'description' => 'إنشاء مستند جديد'],
            ['name' => 'update_own_commercial_document',     'display_name' => 'تعديل مستند أنشأه',       'group' => 'المستندات', 'description' => 'تعديل مستند أنشأه المستخدم'],
            ['name' => 'update_any_commercial_document',     'display_name' => 'تعديل أي مستند',          'group' => 'المستندات', 'description' => 'تعديل مستند أنشأه أي شخص'],
            ['name' => 'delete_own_commercial_document',     'display_name' => 'حذف مستند أنشأه',         'group' => 'المستندات', 'description' => 'حذف مستند أنشأه المستخدم'],
            ['name' => 'delete_any_commercial_document',     'display_name' => 'حذف أي مستند',            'group' => 'المستندات', 'description' => 'حذف مستند أنشأه أي شخص'],
            ['name' => 'unlock_commercial_document',         'display_name' => 'فتح قفل مستند',           'group' => 'المستندات', 'description' => 'فتح قفل مستند مقفل'],
            ['name' => 'clone_commercial_document',          'display_name' => 'استنساخ مستند',           'group' => 'المستندات', 'description' => 'إنشاء نسخة من مستند'],
            ['name' => 'return_commercial_document',         'display_name' => 'إنشاء مستند إرجاع',       'group' => 'المستندات', 'description' => 'إنشاء مستند إرجاع'],
            ['name' => 'convert_commercial_document',        'display_name' => 'تحويل مستند',             'group' => 'المستندات', 'description' => 'تحويل مستند إلى نوع آخر'],
            ['name' => 'apply_discount_commercial_document', 'display_name' => 'تطبيق خصم',               'group' => 'المستندات', 'description' => 'تطبيق خصم على مستند'],
            ['name' => 'change_price_commercial_document',   'display_name' => 'تغيير سعر الوحدة',        'group' => 'المستندات', 'description' => 'تغيير سعر الوحدة في سطور المستند'],
            ['name' => 'override_stock_commercial_document', 'display_name' => 'بيع بمخزون سالب',         'group' => 'المستندات', 'description' => 'تجاوز حماية المخزون'],
            ['name' => 'view_cost_price',                    'display_name' => 'رؤية تكلفة الشراء',       'group' => 'المستندات', 'description' => 'رؤية سعر التكلفة'],
            ['name' => 'add_payment_commercial_document',    'display_name' => 'إضافة دفعة',              'group' => 'المستندات', 'description' => 'إضافة دفعة لمستند'],
            ['name' => 'print_commercial_document',          'display_name' => 'طباعة مستند',             'group' => 'المستندات', 'description' => 'طباعة مستند'],

            // ══════════════════════════════════════════════════════
            // 6. المدفوعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_payment', 'display_name' => 'عرض قائمة المدفوعات', 'group' => 'المدفوعات'],
            ['name' => 'view_payment',     'display_name' => 'عرض دفعة',            'group' => 'المدفوعات'],
            ['name' => 'create_payment',   'display_name' => 'إنشاء دفعة',          'group' => 'المدفوعات'],
            ['name' => 'update_payment',   'display_name' => 'تعديل دفعة',          'group' => 'المدفوعات'],
            ['name' => 'delete_payment',   'display_name' => 'حذف دفعة',            'group' => 'المدفوعات'],

            // ══════════════════════════════════════════════════════
            // 7. الشيكات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_check',     'display_name' => 'عرض قائمة الشيكات',  'group' => 'الشيكات'],
            ['name' => 'view_check',         'display_name' => 'عرض شيك',            'group' => 'الشيكات'],
            ['name' => 'create_check',       'display_name' => 'إنشاء شيك',          'group' => 'الشيكات'],
            ['name' => 'update_check',       'display_name' => 'تعديل شيك',          'group' => 'الشيكات'],
            ['name' => 'delete_check',       'display_name' => 'حذف شيك',            'group' => 'الشيكات'],
            ['name' => 'manage_check_status','display_name' => 'إدارة حالة الشيكات', 'group' => 'الشيكات'],

            // ══════════════════════════════════════════════════════
            // 8. المصروفات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_expense', 'display_name' => 'عرض قائمة المصروفات', 'group' => 'المصروفات'],
            ['name' => 'view_expense',     'display_name' => 'عرض مصروف',           'group' => 'المصروفات'],
            ['name' => 'create_expense',   'display_name' => 'إنشاء مصروف',         'group' => 'المصروفات'],
            ['name' => 'update_expense',   'display_name' => 'تعديل مصروف',         'group' => 'المصروفات'],
            ['name' => 'delete_expense',   'display_name' => 'حذف مصروف',           'group' => 'المصروفات'],

            // ══════════════════════════════════════════════════════
            // 9. الخزينة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_treasury_account', 'display_name' => 'عرض حسابات الخزينة',    'group' => 'الخزينة'],
            ['name' => 'view_treasury_account',     'display_name' => 'عرض حساب خزينة',        'group' => 'الخزينة'],
            ['name' => 'create_treasury_account',   'display_name' => 'إنشاء حساب خزينة',      'group' => 'الخزينة'],
            ['name' => 'update_treasury_account',   'display_name' => 'تعديل حساب خزينة',      'group' => 'الخزينة'],
            ['name' => 'delete_treasury_account',   'display_name' => 'حذف حساب خزينة',        'group' => 'الخزينة'],

            // ══════════════════════════════════════════════════════
            // 10. المخزون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_stock_movement', 'display_name' => 'عرض حركات المخزون',       'group' => 'المخزون'],
            ['name' => 'view_stock_movement',     'display_name' => 'عرض حركة مخزون',         'group' => 'المخزون'],
            ['name' => 'create_stock_movement',   'display_name' => 'إنشاء حركة مخزون',       'group' => 'المخزون'],
            ['name' => 'delete_stock_movement',   'display_name' => 'حذف حركة مخزون',         'group' => 'المخزون'],
            ['name' => 'view_any_product_lot',    'display_name' => 'عرض دفعات المنتجات',     'group' => 'المخزون'],
            ['name' => 'manage_product_lot',      'display_name' => 'إدارة دفعات المنتجات',   'group' => 'المخزون'],
            ['name' => 'manage_opening_balances', 'display_name' => 'إدارة الأرصدة الافتتاحية','group' => 'المخزون'],

            // ══════════════════════════════════════════════════════
            // 11. الموظفون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_employee',           'display_name' => 'عرض قائمة الموظفين', 'group' => 'الموظفون'],
            ['name' => 'view_employee',               'display_name' => 'عرض موظف',           'group' => 'الموظفون'],
            ['name' => 'create_employee',             'display_name' => 'إنشاء موظف',         'group' => 'الموظفون'],
            ['name' => 'update_employee',             'display_name' => 'تعديل موظف',         'group' => 'الموظفون'],
            ['name' => 'delete_employee',             'display_name' => 'حذف موظف',           'group' => 'الموظفون'],
            ['name' => 'manage_employment_contracts', 'display_name' => 'إدارة عقود العمل',   'group' => 'الموظفون'],

            // ══════════════════════════════════════════════════════
            // 12. التقارير
            // ══════════════════════════════════════════════════════
            ['name' => 'view_sales_report',     'display_name' => 'تقرير المبيعات',   'group' => 'التقارير'],
            ['name' => 'view_purchase_report',  'display_name' => 'تقرير المشتريات',  'group' => 'التقارير'],
            ['name' => 'view_inventory_report', 'display_name' => 'تقرير المخزون',    'group' => 'التقارير'],
            ['name' => 'view_financial_report', 'display_name' => 'التقارير المالية', 'group' => 'التقارير'],
            ['name' => 'view_party_report',     'display_name' => 'تقارير الأطراف',   'group' => 'التقارير'],
            ['name' => 'view_dashboard',        'display_name' => 'عرض لوحة التحكم', 'group' => 'التقارير'],

            // ══════════════════════════════════════════════════════
            // 13. السنوات المالية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_fiscal_year', 'display_name' => 'عرض السنوات المالية',  'group' => 'السنوات المالية'],
            ['name' => 'manage_fiscal_year',   'display_name' => 'إدارة السنوات المالية', 'group' => 'السنوات المالية'],

            // ══════════════════════════════════════════════════════
            // 14. الإعدادات
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_settings',    'display_name' => 'إدارة الإعدادات',     'group' => 'الإعدادات'],
            ['name' => 'view_settings',      'display_name' => 'عرض الإعدادات',       'group' => 'الإعدادات'],
            ['name' => 'manage_lookups',     'display_name' => 'إدارة جداول البحث',   'group' => 'الإعدادات'],
            ['name' => 'manage_attachments', 'display_name' => 'إدارة المرفقات',      'group' => 'الإعدادات'],
            ['name' => 'view_audit_log',     'display_name' => 'عرض سجل المراجعة',   'group' => 'الإعدادات'],

            // ══════════════════════════════════════════════════════
            // 15. الأدوار
            // ══════════════════════════════════════════════════════
            ['name' => 'view_roles',   'display_name' => 'عرض الأدوار',   'group' => 'الأدوار'],
            ['name' => 'manage_roles', 'display_name' => 'إدارة الأدوار', 'group' => 'الأدوار'],

            // ══════════════════════════════════════════════════════
            // 16. الشركة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_company',           'display_name' => 'عرض الشركة',         'group' => 'الشركة'],
            ['name' => 'update_company',         'display_name' => 'تعديل الشركة',        'group' => 'الشركة'],
            ['name' => 'manage_company_members', 'display_name' => 'إدارة أعضاء الشركة', 'group' => 'الشركة'],
            ['name' => 'transfer_ownership',     'display_name' => 'نقل ملكية الشركة',   'group' => 'الشركة'],

            // ══════════════════════════════════════════════════════
            // 17. التنبيهات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_notification', 'display_name' => 'عرض التنبيهات',  'group' => 'التنبيهات'],
            ['name' => 'manage_notifications',  'display_name' => 'إدارة التنبيهات', 'group' => 'التنبيهات'],

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

            // ══════════════════════════════════════════════════════
            // 19. طلبات البوابة
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_portal_orders', 'display_name' => 'إدارة طلبات البوابة', 'group' => 'طلبات البوابة'],

            // ══════════════════════════════════════════════════════
            // 20. قوالب الطباعة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_print_templates',   'display_name' => 'عرض قوالب الطباعة',   'group' => 'قوالب الطباعة'],
            ['name' => 'manage_print_templates', 'display_name' => 'إدارة قوالب الطباعة', 'group' => 'قوالب الطباعة'],

            // ══════════════════════════════════════════════════════
            // 21. النسخ الاحتياطي
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_backup', 'display_name' => 'إدارة النسخ الاحتياطي', 'group' => 'النسخ الاحتياطي'],

            // ══════════════════════════════════════════════════════
            // 22. الطابعات
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_printer', 'display_name' => 'إدارة الطابعات', 'group' => 'الطابعات'],
        ];
    }
}
