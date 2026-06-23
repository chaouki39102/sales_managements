# Module Export: Role
Generated at: 2026-05-31 12:43:35

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Role.php
```php
<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use App\Core\Traits\HasStandardizedConfiguration;

class Role extends SpatieRole
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'company_id',
        'name',
        'guard_name',
        'display_name',
        'description',
    ];

    public static array $searchableFields = ['name', 'display_name', 'description'];
    public static array $filterable = ['guard_name', 'company_id'];
    public static array $sortable = ['id', 'name', 'display_name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['permissions', 'users'];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['roles', 'permissions'];
    public static array $scopes = [];
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\RoleController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoleController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET    /{company}/roles              → index()
 *   GET    /{company}/roles/{role}       → show($id)
 *   POST   /{company}/roles              → store(Request)
 *   PUT    /{company}/roles/{role}       → update(Request, $id)
 *   DELETE /{company}/roles/{role}       → destroy($id)
 *
 * ✅ متوافق مع BaseApiController:
 *   - extractId() يتعامل مع route params تلقائياً
 *   - resolveRouteId() يبحث عن 'role' ثم 'id' في route params
 *   - getService() و getModelClass() مُعرَّفان
 *   - store() يستخدم StoreRoleRequest (FormRequest)
 *   - update() يستخدم UpdateRoleRequest (FormRequest)
 * ══════════════════════════════════════════════════════════════════
 */
class RoleController extends BaseApiController
{
    protected string  $resourceName  = 'role';
    protected ?string $resourceClass = RoleResource::class;

    public function __construct(private readonly RoleService $roleService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/roles
    //
    // ✅ BaseApiController::index() يستدعي getListData() → HasApiList
    // HasApiList يبني query من getListConfig() في RoleService
    // getListConfig() يضع ->distinct() لمنع التكرار
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController — لا نحتاج override

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/roles/{role}
    //
    // ✅ extractId() يستخرج 'role' من route params تلقائياً
    // لا نحتاج override إلا لإضافة RoleResource
    // ──────────────────────────────────────────────────────────────

    
    public function show($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId, ['permissions']);
            $this->authorizeAction('view', $role);
            return $this->successResponse(new RoleResource($role));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // store — POST /{company}/roles
    //
    // ✅ يستخدم StoreRoleRequest بدل Request عادي
    // BaseApiController::store() يستدعي getValidatedData() التي
    // تتحقق إذا كان الـ request FormRequest → تستدعي validated()
    // ──────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);
            $validatedData = $request instanceof StoreRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->create($validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم إنشاء الدور بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // update — PUT /{company}/roles/{role}
    //
    // ✅ يستخدم UpdateRoleRequest
    // extractId() يحل {role} من route params
    // ──────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('update', $role);
            $validatedData = $request instanceof UpdateRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->update($role, $validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم تحديث الدور بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // destroy — DELETE /{company}/roles/{role}
    // ──────────────────────────────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('delete', $role);

            // ✅ لا نسمح بحذف الأدوار الأساسية
            if (in_array($role->name, ['owner', 'admin', 'super-admin'], true)) {
                return $this->errorResponse(
                    'لا يمكن حذف الأدوار الأساسية للنظام',
                    409,
                    'BUSINESS_RULE_VIOLATION'
                );
            }

            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ──────────────────────────────────────────────────────────────
    // ✅ resolveRouteId — يبحث عن 'role' في route params
    // ──────────────────────────────────────────────────────────────

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('role', 'id');
    }
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\CompanyRoleService.php
```php
<?php

namespace App\Services;

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
 *  3. Console command: php artisan company:seed-roles {company_id}
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
            ->where('company_id', $companyId)
            ->first();
    }

    /**
     * التحقق من أن المستخدم يملك دوراً محدداً في شركة.
     */
    public function hasRole(User $user, string $roleName, int $companyId): bool
    {
        return $user->roles()
            ->where('name', $roleName)
            ->where('company_id', $companyId)
            ->exists();
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
        $globalPerms = Permission::whereNull('company_id')->get()->keyBy('name');

        foreach ($this->getRolePermissionsMap() as $roleName => $permNames) {

            $role = Role::where('name', $roleName)
                ->where('company_id', $companyId)
                ->where('guard_name', 'web')
                ->first();

            if (! $role) {
                Log::warning("[CompanyRoleService] الدور '{$roleName}' غير موجود للشركة #{$companyId}");
                continue;
            }

            $perms = $globalPerms->only($permNames)->values();
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
                'name'         => 'admin',
                'display_name' => 'مدير الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'محاسب',
                'description'  => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية',
            ],
            [
                'name'         => 'salesperson',
                'display_name' => 'بائع',
                'description'  => 'إنشاء مستندات البيع وإدارة الزبائن',
            ],
            [
                'name'         => 'warehouse',
                'display_name' => 'أمين المخزن',
                'description'  => 'إدارة المخزون وحركاته',
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
            // مدير الشركة — صلاحيات كاملة على موارد الشركة
            // ══════════════════════════════════════════════════════
            'admin' => [
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
            // المحاسب — مالية وتقارير بدون تعديل بيانات تجارية
            // ══════════════════════════════════════════════════════
            'accountant' => [
                // الأطراف (قراءة)
                'view_any_party', 'view_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (تأكيد فقط)
                'view_any_commercial_document', 'view_commercial_document',
                'validate_commercial_document',
                // المدفوعات (كاملة)
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات (كاملة)
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات (كاملة)
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة (إدارة)
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_financial_report',
                'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_payment_mode', 'view_any_expense_category',
                'view_any_exchange_rate', 'view_any_treasury_account_type',
            ],

            // ══════════════════════════════════════════════════════
            // البائع — مبيعات وزبائن فقط
            // ══════════════════════════════════════════════════════
            'salesperson' => [
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
            // أمين المخزن — مخزون فقط
            // ══════════════════════════════════════════════════════
            'warehouse' => [
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (قراءة فقط)
                'view_any_commercial_document', 'view_commercial_document',
                // المخزون (كامل)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // التقارير
                'view_inventory_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_unit', 'view_any_family', 'view_any_brand',
                'view_any_stock_movement_type', 'view_any_inventory_valuation_method',
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

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\RoleService.php
```php
<?php

namespace App\Services;

use App\Models\Role;
use App\Core\Services\BaseService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\PermissionRegistrar;

class RoleService extends BaseService
{
    protected string $model        = Role::class;
    protected string $resourceName = 'role';

    // ✅ permissions دائماً في defaultWith — لأن كل role يحتاجها
    protected array $defaultWith  = ['permissions'];

    protected function getResourceName(): string
    {
        return 'role';
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ الإصلاح الجذري للتكرار:
    //
    // المشكلة: SpatieRole لا يرث HasCompany trait، لذا
    // BaseService::applyScopeToQuery() لا تُضيف WHERE company_id،
    // فتُرجع أدوار جميع الشركات (79 دور بدل 6).
    //
    // الحل: إضافة WHERE company_id يدوياً في modifyQuery،
    // مع استثناء super-admin (company_id IS NULL).
    //
    // المنطق:
    //   - أدوار tenant  → WHERE company_id = $currentCompanyId
    //   - super-admin   → WHERE company_id IS NULL  (عالمي)
    //   - المستخدم العادي يرى أدوار شركته فقط
    // ══════════════════════════════════════════════════════════════

protected function getListConfig(): array
{
    $companyId = $this->getCurrentCompanyId();

    return [
        'searchable'      => Role::$searchableFields,
        'filterable'      => Role::$filterable,
        'sortable'        => Role::$sortable,
        'defaultSort'     => Role::$defaultSort,
        'defaultWith'     => ['permissions'],
        'allowedIncludes' => Role::$allowedIncludes,
        'cache_tags'      => ['roles', 'permissions'],

        // ✅ query_callback بدلاً من modifyQuery
        'query_callback'  => function ($qb) use ($companyId) {
            if ($companyId) {
                $qb->where('company_id', $companyId);
            } else {
                $qb->whereNull('company_id');
            }
            return $qb;
        },
    ];
}

    // ══════════════════════════════════════════════════════════════
    // Hooks
    // ══════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        // ✅ guard_name ضروري لـ Spatie — لا يحذفه BaseService
        // لكن company_id يحذفه BaseService في beforeCreate
        // نحتفظ به هنا قبل استدعاء parent
        $companyId = $data['company_id'] ?? $this->getCurrentCompanyId();

        // BaseService::beforeCreate يحذف company_id لأنه
        // يعتمد على HasCompany Scope — لكن Spatie Role
        // يحتاج company_id صريحاً في $fillable
        $data = parent::beforeCreate($data, $request);

        // ✅ نُعيد company_id بعد parent
        if ($companyId) {
            $data['company_id'] = $companyId;
        }

        $data['guard_name'] ??= 'web';

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if (!empty($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
        $this->forgetSpatieCache();
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ override update() لمعالجة permission_ids
    // BaseService::prepareDataForUpdate يحذف company_id و permission_ids
    // نستخرج permission_ids قبل parent::update ثم نطبقها بعده
    // ══════════════════════════════════════════════════════════════

    public function update(Model $item, array $data, ?Request $request = null): Model
    {
        // استخرج permission_ids قبل أن يحذفها prepareDataForUpdate
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null;

        $item = parent::update($item, $data, $request);

        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
            $this->forgetSpatieCache();
        }

        return $item->fresh(['permissions']);
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // ✅ أزل permission_ids — تُعالج في update() بعد parent
        unset($data['permission_ids']);
        return parent::prepareDataForUpdate($item, $data, $request);
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        $item->load('permissions');
    }

    protected function afterDelete(Model $item): void
    {
        $this->forgetSpatieCache();
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    private function forgetSpatieCache(): void
    {
        try {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {
            Log::warning('forgetCachedPermissions failed', ['error' => $e->getMessage()]);
        }
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreRoleRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization في Controller عبر Policy
    }

    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:100|unique:roles,name',
            'display_name'     => 'nullable|string|max:150',
            'description'      => 'nullable|string|max:500',
            'guard_name'       => 'nullable|string|max:50',
            'permission_ids'   => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الدور مطلوب',
            'name.unique'   => 'هذا الدور موجود بالفعل',
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateRoleRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ✅ استخراج الـ ID بأمان — قد يكون route('role') أو route('id')
        $roleId = $this->route('role') ?? $this->route('id');

        return [
            'display_name'     => 'nullable|string|max:150',
            'description'      => 'nullable|string|max:500',
            'guard_name'       => 'nullable|string|max:50',
            'permission_ids'   => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
            // name اختياري عند التحديث + تجاهل السجل الحالي في unique
            'name'             => "sometimes|string|max:100|unique:roles,name,{$roleId}",
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\RolePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RolePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_role');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_role');
    }

    public function create(User $user): bool
    {
        return $user->can('create_role');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_role');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_role');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_role');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_role');
    }
}
```

