<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CompanyRoleService
 * ══════════════════════════════════════════════════════════════════
 * خدمة إنشاء وإدارة الأدوار والصلاحيات لكل شركة في نظام Multi-Tenancy.
 *
 * تُستدعى في:
 *  1. CompanyObserver::created()  ← تلقائياً عند إنشاء شركة جديدة
 *  2. RolesAndPermissionsSeeder   ← عند التهيئة الأولى للنظام
 *  3. Console command: php artisan company:upgrade-roles {company_id} ← ترقية الشركات القائمة
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyRoleService
{
    // ─────────────────────────────────────────────────────────────
    // نقطة الدخول الرئيسية
    // ─────────────────────────────────────────────────────────────

    /**
     * إنشاء أدوار الشركة الجديدة وتعيين صلاحياتها.
     * آمنة للاستدعاء المتعدد (idempotent).
     */
    public function seedRoles(int $companyId): void
    {
        DB::transaction(function () use ($companyId) {

            $this->createCompanyRoles($companyId);
            $this->assignPermissionsToRoles($companyId);

            // مسح الكاش بعد أي تعديل على الأدوار/الصلاحيات
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("✅ [CompanyRoleService] تم إنشاء أدوار الشركة #{$companyId}");
        });
    }

    /**
     * تعيين دور معيّن لمستخدم داخل شركة.
     */
    public function assignRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->firstOrFail();

        // Spatie يسمح بأدوار متعددة — نُحدّد دور الشركة الواحدة فقط
        $user->assignRole($role);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * إزالة دور مستخدم داخل شركة معيّنة.
     */
    public function removeRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->first();

        if ($role) {
            $user->removeRole($role);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * جلب الدور الحالي للمستخدم داخل شركة.
     */
    public function getUserRole(User $user, int $companyId): ?Role
    {
        return $user->roles()
            ->where('roles.company_id', $companyId)
            ->first();
    }

    /**
     * التحقق من أن المستخدم يملك دوراً محدداً في شركة.
     */
    public function hasRole(User $user, string $roleName, int $companyId): bool
    {
        return $user->roles()
            ->where('name', $roleName)
            ->where('roles.company_id', $companyId)
            ->exists();
    }

    // ─────────────────────────────────────────────────────────────
    // ترقية مجموعة الأدوار القديمة إلى المجموعة المعيارية
    // ─────────────────────────────────────────────────────────────

    /**
     * خريطة ترقية الأدوار القديمة → الأدوار المعيارية (owner/manager/cashier/viewer).
     * تُستخدم في أمر company:upgrade-roles لتعديل بيانات الشركات الحالية.
     */
    public const LEGACY_ROLE_MIGRATION = [
        'admin'       => 'owner',
        'accountant'  => 'manager',
        'salesperson' => 'cashier',
        'warehouse'   => 'manager',
    ];

    /**
     * ترقية شركة إلى مجموعة الأدوار المعيارية:
     *  1. seedRoles يضمن وجود الأدوار الأربعة وصلاحياتها (idempotent).
     *  2. كل مستخدم له دور قديم يُنقل إلى الدور الجديد المقابل له.
     *  3. الأدوار القديمة تُحذف (حذف الدور يُزيل روابطه تلقائياً عبر FK cascade).
     * آمنة للاستدعاء المتعدد (idempotent) — تُرجع عدد المستخدمين المنقولين لكل دور قديم.
     */
    public function migrateToStandardRoleSet(int $companyId): array
    {
        return DB::transaction(function () use ($companyId) {
            $this->seedRoles($companyId);

            // مالك الشركة يملك دور owner دائماً (حتى لو لم يكن له دور قديم)
            $company = Company::find($companyId);
            if ($company?->owner_id) {
                $owner = User::find($company->owner_id);
                if ($owner && ! $this->hasRole($owner, 'owner', $companyId)) {
                    $this->assignRole($owner, 'owner', $companyId);
                }
            }

            $migrated = [];
            foreach (self::LEGACY_ROLE_MIGRATION as $legacy => $target) {
                $legacyRole = Role::where('name', $legacy)
                    ->where('company_id', $companyId)
                    ->where('guard_name', 'web')
                    ->first();

                if (! $legacyRole) {
                    $migrated[$legacy] = 0;
                    continue;
                }

                $users = $legacyRole->users()->get();
                foreach ($users as $user) {
                    if (! $this->hasRole($user, $target, $companyId)) {
                        $this->assignRole($user, $target, $companyId);
                    }
                }

                $migrated[$legacy] = $users->count();
                $legacyRole->delete();
            }

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("✅ [CompanyRoleService] تمت ترقية أدوار الشركة #{$companyId}", $migrated);

            return $migrated;
        });
    }

    // ─────────────────────────────────────────────────────────────
    // إنشاء الأدوار
    // ─────────────────────────────────────────────────────────────

    private function createCompanyRoles(int $companyId): void
    {
        foreach ($this->getRolesDefinition() as $roleData) {
            Role::firstOrCreate(
                [
                    'name'       => $roleData['name'],
                    'guard_name' => 'web',
                    'company_id' => $companyId,
                ],
                [
                    'display_name' => $roleData['display_name'],
                    'description'  => $roleData['description'] ?? '',
                ]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعيين الصلاحيات للأدوار
    // ─────────────────────────────────────────────────────────────

    private function assignPermissionsToRoles(int $companyId): void
    {
        $globalPerms = Permission::whereNull('company_id')->get();

        foreach ($this->getRolePermissionsMap() as $roleName => $permNames) {

            $role = Role::where('name', $roleName)
                ->where('company_id', $companyId)
                ->where('guard_name', 'web')
                ->first();

            if (! $role) {
                Log::warning("[CompanyRoleService] الدور '{$roleName}' غير موجود للشركة #{$companyId}");
                continue;
            }

            $perms = $globalPerms->whereIn('name', $permNames);
            $role->syncPermissions($perms);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعريف الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolesDefinition(): array
    {
        return [
            [
                'name'         => 'owner',
                'display_name' => 'مالك الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'cashier',
                'display_name' => 'أمين الصندوق',
                'description'  => 'تشغيل نقطة البيع وإنشاء مستندات البيع وإدارة الزبائن',
            ],
            [
                'name'         => 'viewer',
                'display_name' => 'مشاهد',
                'description'  => 'قراءة فقط بدون أي صلاحيات كتابة',
            ],
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // خريطة صلاحيات الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolePermissionsMap(): array
    {
        return [

            // ══════════════════════════════════════════════════════
            // مالك الشركة — صلاحيات كاملة على موارد الشركة
            // ══════════════════════════════════════════════════════
            'owner' => [
                // المستخدمون
                'view_any_user', 'view_user', 'create_user', 'update_user', 'delete_user',
                'restore_user', 'force_delete_user', 'toggle_active_user',
                'change_password_user', 'assign_role_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party',
                'delete_party', 'restore_party', 'force_delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'restore_product', 'manage_product_prices',
                'manage_product_variants', 'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'create_warehouse',
                'update_warehouse', 'delete_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                'manage_numbering_series',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                'delete_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'delete_stock_movement', 'view_any_product_lot', 'manage_product_lot',
                'manage_opening_balances',
                // الموظفون
                'view_any_employee', 'view_employee', 'create_employee',
                'update_employee', 'delete_employee', 'manage_employment_contracts',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية
                'view_any_fiscal_year', 'manage_fiscal_year',
                // الإعدادات
                'manage_settings', 'manage_lookups', 'manage_attachments', 'view_audit_log',
                // الأدوار
                'view_roles', 'manage_roles',
                // الشركة
                'view_company', 'update_company', 'manage_company_members', 'transfer_ownership',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث — عملات وتقييم وما إلى ذلك
                'view_any_currency',  'create_currency',  'update_currency',  'delete_currency',
                'view_any_tva',       'create_tva',       'update_tva',       'delete_tva',
                'view_any_unit',      'create_unit',      'update_unit',      'delete_unit',
                'view_any_family',    'create_family',    'update_family',    'delete_family',
                'view_any_brand',     'create_brand',     'update_brand',     'delete_brand',
                'view_any_price_level',  'create_price_level',  'update_price_level',  'delete_price_level',
                'view_any_payment_mode', 'create_payment_mode', 'update_payment_mode', 'delete_payment_mode',
                'view_any_expense_category', 'create_expense_category', 'update_expense_category', 'delete_expense_category',
                'view_any_exchange_rate',    'create_exchange_rate',    'update_exchange_rate',    'delete_exchange_rate',
                'view_any_document_type',    'create_document_type',    'update_document_type',    'delete_document_type',
                'view_any_document_status',  'create_document_status',  'update_document_status',  'delete_document_status',
                'view_any_gender',      'create_gender',      'update_gender',      'delete_gender',
                'view_any_legal_form',  'create_legal_form',  'update_legal_form',  'delete_legal_form',
                'view_any_party_type',  'create_party_type',  'update_party_type',  'delete_party_type',
                'view_any_product_type','create_product_type','update_product_type','delete_product_type',
                'view_any_treasury_account_type',  'create_treasury_account_type',  'update_treasury_account_type',  'delete_treasury_account_type',
                'view_any_stock_movement_type',    'create_stock_movement_type',    'update_stock_movement_type',    'delete_stock_movement_type',
                'view_any_inventory_valuation_method', 'create_inventory_valuation_method', 'update_inventory_valuation_method', 'delete_inventory_valuation_method',
            ],

            // ══════════════════════════════════════════════════════
            // مدير العمليات — عمليات يومية شاملة بدون إعدادات حساسة
            // ══════════════════════════════════════════════════════
            'manager' => [
                // المستخدمون (قراءة فقط)
                'view_any_user', 'view_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party', 'delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'manage_product_prices', 'manage_product_variants',
                'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'update_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense',
                // الخزينة (قراءة فقط)
                'view_any_treasury_account', 'view_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // الموظفون (قراءة فقط)
                'view_any_employee', 'view_employee',
                // التقارير (كاملة)
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_lookups', 'manage_attachments', 'view_roles', 'view_company',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_tva', 'view_any_unit', 'view_any_family',
                'view_any_brand', 'view_any_price_level', 'view_any_payment_mode',
                'view_any_expense_category', 'view_any_exchange_rate',
                'view_any_document_type', 'view_any_document_status',
            ],

            // ══════════════════════════════════════════════════════
            // أمين الصندوق — مبيعات وزبائن فقط
            // ══════════════════════════════════════════════════════
            'cashier' => [
                // الأطراف (إنشاء وتعديل)
                'view_any_party', 'view_party', 'create_party', 'update_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات البيع فقط
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'update_commercial_document',
                'duplicate_commercial_document',
                // المدفوعات (قراءة + إنشاء)
                'view_any_payment', 'view_payment', 'create_payment',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement',
                // التقارير المتعلقة بالمبيعات
                'view_sales_report', 'view_party_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_price_level', 'view_any_payment_mode', 'view_any_tva',
                'view_any_unit', 'view_any_family', 'view_any_brand',
            ],

            // ══════════════════════════════════════════════════════
            // المشاهد — قراءة فقط بلا استثناء
            // ══════════════════════════════════════════════════════
            'viewer' => [
                'view_any_party', 'view_party',
                'view_any_product', 'view_product',
                'view_any_warehouse', 'view_warehouse',
                'view_any_commercial_document', 'view_commercial_document',
                'view_any_payment', 'view_payment',
                'view_any_check', 'view_check',
                'view_any_expense', 'view_expense',
                'view_any_treasury_account', 'view_treasury_account',
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                'view_any_employee', 'view_employee',
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                'view_any_fiscal_year', 'view_roles', 'view_company',
                'view_any_notification',
            ],
        ];
    }
}
