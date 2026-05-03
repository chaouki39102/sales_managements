<?php

use Illuminate\Support\Facades\Route;

// Auth
use App\Http\Controllers\Api\V1\AuthController;

// Company Management
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\V1\UserController;

// Tenant Resources
use App\Http\Controllers\Api\V1\PartyController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CommercialDocumentController;
use App\Http\Controllers\Api\V1\CommercialDocumentLineController;
use App\Http\Controllers\Api\V1\WarehouseController;
use App\Http\Controllers\Api\V1\NumberingSeriesController;
use App\Http\Controllers\Api\V1\OpeningBalanceStockController;
use App\Http\Controllers\Api\V1\OpeningBalancePartyController;
use App\Http\Controllers\Api\V1\CheckController;
use App\Http\Controllers\Api\V1\TreasuryAccountController;
use App\Http\Controllers\Api\V1\QuantityDiscountController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ProductLotController;
use App\Http\Controllers\Api\V1\FiscalYearController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\StockMovementController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\EmploymentContractController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;

// Lookup Controllers (Global)
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\ExchangeRateController;
use App\Http\Controllers\Api\V1\DocumentStatusController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\PaymentModeController;
use App\Http\Controllers\Api\V1\PriceLevelController;
use App\Http\Controllers\Api\V1\LegalFormController;
use App\Http\Controllers\Api\V1\TvaController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\CommuneController;
use App\Http\Controllers\Api\V1\WilayaController;
use App\Http\Controllers\Api\V1\StockMovementTypeController;
use App\Http\Controllers\Api\V1\ProductTypeController;
use App\Http\Controllers\Api\V1\PartyTypeController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\GenderController;
use App\Http\Controllers\Api\V1\InventoryValuationMethodController;
use App\Http\Controllers\Api\V1\TreasuryAccountTypeController;
use App\Http\Controllers\Api\V1\FiscalStampController;
use App\Http\Controllers\Api\V1\DocumentBaseOperationController;
use App\Http\Controllers\Api\V1\BarcodeController;
use App\Http\Controllers\Api\V1\ProductVariantController;

use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Models\Company;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes (Laravel 11) — Multi-Tenancy Professional Structure
|--------------------------------------------------------------------------
|
| هيكل الـ URL — 5 طبقات واضحة:
|
|   ① /api/v1/auth/*                     ← المصادقة (عام + محمي) + الملف الشخصي
|   ② /api/v1/companies/*                ← إدارة شركات المستخدم
|   ③ /api/v1/admin/*                    ← Super Admin: إدارة النظام الكاملة
|   ④ /api/v1/lookups/*                  ← جداول مرجعية: GET للجميع، الكتابة لـ super-admin فقط
|   ⑤ /api/v1/{company_slug}/{resource}  ← بيانات معزولة حسب الشركة (3 مستويات صلاحيات)
|
*/

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════
    // ① AUTH — المصادقة + الملف الشخصي
    // ═══════════════════════════════════════════
    Route::prefix('auth')->group(function () {
        // Public
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login',    [AuthController::class, 'login']);

        // Protected
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',              [AuthController::class, 'me']);
            Route::put('/update',          [AuthController::class, 'update']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/logout',         [AuthController::class, 'logout']);

            // Personal profile management
            Route::prefix('profile')->group(function () {
                Route::get('/', [UserController::class, 'profile']);
                Route::put('/', [UserController::class, 'updateProfile']);
                Route::post('/avatar', [UserController::class, 'updateAvatar']);
                Route::post('/change-password', [AuthController::class, 'changePassword']);
            });
        });
    });

    // ═══════════════════════════════════════════
    // ② USER COMPANIES — إدارة شركات المستخدم
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->prefix('companies')->group(function () {

        // عرض وإنشاء (متاح للمستخدمين العاديين)
        Route::get('/',        [CompanyController::class, 'index']);
        Route::post('/',       function (StoreCompanyRequest $request) {
            return app(CompanyController::class)->store($request);
        });
        Route::get('/current', [CompanyController::class, 'current']);
        Route::post('/switch', [CompanyController::class, 'switch']);

        // عرض وتعديل شركة محددة
        Route::get('/{company}', function ($company) {
            return app(CompanyController::class)->show($company);
        });
        Route::put('/{company}', function (UpdateCompanyRequest $request, $company) {
            return app(CompanyController::class)->update($request, $company);
        });
        Route::patch('/{company}', function (UpdateCompanyRequest $request, $company) {
            return app(CompanyController::class)->update($request, $company);
        });

        // إدارة الأعضاء (المالك ومدير الشركة فقط)
        Route::get('/{company}/members', fn(Company $company) => app(CompanyController::class)->members($company));
        Route::post('/{company}/members', fn(Request $request, Company $company) => app(CompanyController::class)->addMember($request, $company));
        Route::delete('/{company}/members/{userId}', fn(Company $company, int $userId) => app(CompanyController::class)->removeMember($company, $userId));
        Route::patch('/{company}/members/{userId}/role', fn(Request $request, Company $company, int $userId) => app(CompanyController::class)->changeMemberRole($request, $company, $userId));
        Route::patch('/{company}/members/{userId}/deactivate', fn(Company $company, int $userId) => app(CompanyController::class)->deactivateMember($company, $userId));
        Route::patch('/{company}/members/{userId}/activate', fn(Company $company, int $userId) => app(CompanyController::class)->activateMember($company, $userId));
        Route::post('/{company}/transfer-ownership', fn(Request $request, Company $company) => app(CompanyController::class)->transferOwnership($request, $company));
    });

    // ═══════════════════════════════════════════
    // ③ SUPER ADMIN — إدارة النظام الكاملة
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('admin')->group(function () {

        // الشركات
        Route::prefix('companies')->group(function () {
            Route::get('/stats', fn() => app(AdminCompanyController::class)->stats());
            Route::post('/{company}/suspend', fn(Request $request, Company $company) => app(AdminCompanyController::class)->suspend($request, $company));
            Route::post('/{company}/unsuspend', fn(Company $company) => app(AdminCompanyController::class)->unsuspend($company));
            Route::post('/{company}/deactivate', fn(Company $company) => app(AdminCompanyController::class)->deactivate($company));
            Route::post('/{company}/activate', fn(Company $company) => app(AdminCompanyController::class)->activate($company));
            Route::post('/{company}/verify', fn(Company $company) => app(AdminCompanyController::class)->verify($company));
            Route::post('/{company}/unverify', fn(Company $company) => app(AdminCompanyController::class)->unverify($company));
            Route::patch('/{company}/plan', fn(Request $request, Company $company) => app(AdminCompanyController::class)->changePlan($request, $company));
            Route::patch('/{company}/notes', fn(Request $request, Company $company) => app(AdminCompanyController::class)->updateNotes($request, $company));
        });

        // إدارة جميع المستخدمين (عبر كل الشركات)
        Route::prefix('users')->group(function () {
            Route::get('/', fn() => app(UserController::class)->index(request()));
            Route::get('/{user}', fn($user) => app(UserController::class)->show($user));
            Route::post('/{user}/toggle-active', fn($user) => app(UserController::class)->toggleActive($user));
            Route::delete('/{user}', fn($user) => app(UserController::class)->destroy($user));
        });

        // الأدوار والصلاحيات (الكتابة والقراءة)
        Route::prefix('roles')->group(function () {
            Route::get('/', [RoleController::class, 'index']);
            Route::get('/{role}', [RoleController::class, 'show']);
            Route::post('/', [RoleController::class, 'store']);
            Route::put('/{role}', [RoleController::class, 'update']);
            Route::patch('/{role}', [RoleController::class, 'update']);
            Route::delete('/{role}', [RoleController::class, 'destroy']);
        });

        Route::prefix('permissions')->group(function () {
            Route::get('/', [PermissionController::class, 'index']);
            Route::get('/{permission}', [PermissionController::class, 'show']);
            Route::post('/', [PermissionController::class, 'store']);
            Route::put('/{permission}', [PermissionController::class, 'update']);
            Route::delete('/{permission}', [PermissionController::class, 'destroy']);
        });

        // إحصائيات وسجل النظام
        Route::get('stats', fn() => app(AdminCompanyController::class)->stats());
        Route::get('audit-log', fn() => app(AuditController::class)->index(request()));
        Route::get('settings', fn() => app(SettingController::class)->index(request()));
    });

    // ═══════════════════════════════════════════
    // ④ LOOKUP TABLES — جداول مرجعية (GET فقط للجميع)
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {

        // الموقع
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);

        // الأشخاص
        Route::apiResource('genders',     GenderController::class)->only(['index', 'show']);
        Route::apiResource('legal-forms', LegalFormController::class)->only(['index', 'show']);

        // العملات
        Route::apiResource('currencies',     CurrencyController::class)->only(['index', 'show']);
        Route::apiResource('exchange-rates', ExchangeRateController::class)->only(['index', 'show']);
        Route::get('exchange-rates/latest',  [ExchangeRateController::class, 'latest']);

        // المنتجات — كتالوج
        Route::apiResource('families', FamilyController::class)->only(['index', 'show']);
        Route::apiResource('brands',   BrandController::class)->only(['index', 'show']);
        Route::apiResource('units',    UnitController::class)->only(['index', 'show']);
        Route::apiResource('tvas',     TvaController::class)->only(['index', 'show']);
        Route::get('tvas/default',     [TvaController::class, 'default']);
        Route::apiResource('price-levels', PriceLevelController::class)->only(['index', 'show']);

        // المستندات والتجارة
        Route::apiResource('document-types',           DocumentTypeController::class)->only(['index', 'show']);
        Route::apiResource('document-statuses',        DocumentStatusController::class)->only(['index', 'show']);
        Route::apiResource('document-base-operations', DocumentBaseOperationController::class)->only(['index', 'show']);
        Route::apiResource('payment-modes',            PaymentModeController::class)->only(['index', 'show']);
        Route::get('payment-modes/active',             [PaymentModeController::class, 'active']);
        Route::apiResource('fiscal-stamps',            FiscalStampController::class)->only(['index', 'show']);

        // المخزون
        Route::apiResource('stock-movement-types',         StockMovementTypeController::class)->only(['index', 'show']);
        Route::apiResource('inventory-valuation-methods',  InventoryValuationMethodController::class)->only(['index', 'show']);
        Route::apiResource('product-types',                ProductTypeController::class)->only(['index', 'show']);

        // الأطراف
        Route::apiResource('party-types', PartyTypeController::class)->only(['index', 'show']);

        // المالية
        Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class)->only(['index', 'show']);

        // المصروفات
        Route::apiResource('expense-categories', ExpenseCategoryController::class)->only(['index', 'show']);
        Route::get('expense-categories/roots',   [ExpenseCategoryController::class, 'roots']);

        // الأدوار والصلاحيات (قراءة فقط)
        Route::get('roles',             [RoleController::class, 'index']);
        Route::get('roles/{role}',      [RoleController::class, 'show']);
        Route::get('permissions',       [PermissionController::class, 'index']);
        Route::get('permissions/by-group', [PermissionController::class, 'byGroup']);
        Route::get('permissions/{permission}', [PermissionController::class, 'show']);
    });

    // ═══════════════════════════════════════════
    // ⑤ TENANT RESOURCES — معزولة بـ company_slug
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            // ────────────────────────────────────
            // ⑤-أ: موارد متاحة لكل أعضاء الشركة (قراءة)
            // ────────────────────────────────────
            Route::get('dashboard',                       [DashboardController::class, 'index']);
            Route::get('dashboard/sales-chart',           [DashboardController::class, 'salesChart']);
            Route::get('dashboard/top-products',          [DashboardController::class, 'topProducts']);
            Route::get('dashboard/top-customers',         [DashboardController::class, 'topCustomers']);
            Route::get('dashboard/recent-transactions',   [DashboardController::class, 'recentTransactions']);
            Route::get('dashboard/inventory',             [DashboardController::class, 'inventory']);

            // التقارير (قراءة للجميع)
            Route::prefix('reports')->group(function () {
                Route::get('sales',     [ReportController::class, 'sales']);
                Route::get('purchases', [ReportController::class, 'purchases']);
                Route::get('customers', [ReportController::class, 'customers']);
                Route::get('suppliers', [ReportController::class, 'suppliers']);
                Route::get('products',  [ReportController::class, 'products']);
                Route::get('inventory', [ReportController::class, 'inventory']);
                Route::get('payments',  [ReportController::class, 'payments']);
                Route::get('taxes',     [ReportController::class, 'taxes']);
            });

            // منتجات — عرض
            Route::get('products',                       [ProductController::class, 'index']);
            Route::get('products/{product}',             [ProductController::class, 'show']);
            Route::get('products/active',                [ProductController::class, 'active']);
            Route::get('products/by-family/{family}',    [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',      [ProductController::class, 'byBrand']);

            // متغيرات المنتج — عرض
            Route::get('product-variants',                          [ProductVariantController::class, 'index']);
            Route::get('product-variants/{variant}',               [ProductVariantController::class, 'show']);
            Route::get('products/{product}/variants',              [ProductVariantController::class, 'indexByProduct']);

            // الباركود — عرض
            Route::get('barcodes',                       [BarcodeController::class, 'index']);
            Route::get('barcodes/{barcode}',             [BarcodeController::class, 'show']);
            Route::get('products/{product}/barcodes',    [BarcodeController::class, 'indexByProduct']);

            // مستودعات — عرض
            Route::get('warehouses',                     [WarehouseController::class, 'index']);
            Route::get('warehouses/{warehouse}',         [WarehouseController::class, 'show']);

            // أطراف — عرض
            Route::get('parties',                        [PartyController::class, 'index']);
            Route::get('parties/{party}',                [PartyController::class, 'show']);
            Route::get('customers',                      [PartyController::class, 'customers']);
            Route::get('suppliers',                      [PartyController::class, 'suppliers']);

            // دفعات — عرض
            Route::get('product-lots',                   [ProductLotController::class, 'index']);
            Route::get('product-lots/{lot}',             [ProductLotController::class, 'show']);
            Route::get('product-lots/available',         [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring',          [ProductLotController::class, 'expiring']);

            // موظفون — عرض
            Route::get('employees',                      [EmployeeController::class, 'index']);
            Route::get('employees/{employee}',           [EmployeeController::class, 'show']);
            Route::get('employees/active',               [EmployeeController::class, 'active']);

            // عقود — عرض
            Route::get('employment-contracts',                               [EmploymentContractController::class, 'index']);
            Route::get('employment-contracts/{contract}',                    [EmploymentContractController::class, 'show']);
            Route::get('employment-contracts/employee/{employee}/active',    [EmploymentContractController::class, 'active']);

            // حركات المخزون — عرض
            Route::get('stock-movements',                  [StockMovementController::class, 'index']);
            Route::get('stock-movements/{movement}',       [StockMovementController::class, 'show']);
            Route::get('stock-movements/incoming',         [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing',         [StockMovementController::class, 'outgoing']);

            // سنوات مالية — عرض
            Route::get('fiscal-years',                     [FiscalYearController::class, 'index']);
            Route::get('fiscal-years/{year}',              [FiscalYearController::class, 'show']);
            Route::get('fiscal-years/current',             [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',                [FiscalYearController::class, 'open']);

            // أدوار وصلاحيات داخل الشركة (قراءة فقط)
            Route::get('roles',                            [RoleController::class, 'index']);
            Route::get('roles/{role}',                     [RoleController::class, 'show']);
            Route::get('permissions',                      [PermissionController::class, 'index']);
            Route::get('permissions/by-group',             [PermissionController::class, 'byGroup']);
            Route::get('permissions/{permission}',         [PermissionController::class, 'show']);

            // إشعارات — المستخدم نفسه
            Route::get('notifications',                    [NotificationController::class, 'index']);
            Route::get('notifications/{notification}',     [NotificationController::class, 'show']);
            Route::get('notifications/unread',             [NotificationController::class, 'unread']);
            Route::post('notifications/{notification}/mark-read', [NotificationController::class, 'markAsRead']);
            Route::post('notifications/mark-all-read',     [NotificationController::class, 'markAllAsRead']);

            // سجل المراجعة — عرض
            Route::get('audits',                           [AuditController::class, 'index']);
            Route::get('audits/{audit}',                   [AuditController::class, 'show']);
            Route::get('audits/user/{user}',               [AuditController::class, 'byUser']);
            Route::get('audits/event/{event}',             [AuditController::class, 'byEvent']);

            // الملف الشخصي داخل الشركة
            Route::prefix('me')->group(function () {
                Route::get('/', [UserController::class, 'profile']);
                Route::put('/', [UserController::class, 'updateProfile']);
                Route::post('/avatar', [UserController::class, 'updateAvatar']);
                Route::post('/change-password', [AuthController::class, 'changePassword']);
            });

            // ────────────────────────────────────
            // ⑤-ب: موارد خاصة بالمالك / المدير
            // ────────────────────────────────────
            Route::middleware('can:manage-company')->group(function () {
                // منتجات — كتابة
                Route::post('products',                    [ProductController::class, 'store']);
                Route::put('products/{product}',           [ProductController::class, 'update']);
                Route::patch('products/{product}',         [ProductController::class, 'update']);
                Route::delete('products/{product}',        [ProductController::class, 'destroy']);

                // باركود — كتابة
                Route::post('barcodes',                    [BarcodeController::class, 'store']);
                Route::put('barcodes/{barcode}',           [BarcodeController::class, 'update']);
                Route::delete('barcodes/{barcode}',        [BarcodeController::class, 'destroy']);

                // متغيرات — كتابة
                Route::post('product-variants',                       [ProductVariantController::class, 'store']);
                Route::put('product-variants/{variant}',              [ProductVariantController::class, 'update']);
                Route::patch('product-variants/{variant}',            [ProductVariantController::class, 'update']);
                Route::delete('product-variants/{variant}',           [ProductVariantController::class, 'destroy']);

                // مستودعات — كتابة
                Route::post('warehouses',                  [WarehouseController::class, 'store']);
                Route::put('warehouses/{warehouse}',       [WarehouseController::class, 'update']);
                Route::patch('warehouses/{warehouse}',     [WarehouseController::class, 'update']);
                Route::delete('warehouses/{warehouse}',    [WarehouseController::class, 'destroy']);

                // أطراف — كتابة
                Route::post('parties',                     [PartyController::class, 'store']);
                Route::put('parties/{party}',              [PartyController::class, 'update']);
                Route::patch('parties/{party}',            [PartyController::class, 'update']);
                Route::delete('parties/{party}',           [PartyController::class, 'destroy']);

                // مستخدمون — كاملة
                Route::get('users/trashed',                [UserController::class, 'trashed']);
                Route::get('users-by-role',                [UserController::class, 'byRole']);
                Route::get('users/active',                 [UserController::class, 'active']);
                Route::get('users/inactive',               [UserController::class, 'inactive']);
                Route::apiResource('users', UserController::class);
                Route::post('users/{user}/restore',        [UserController::class, 'restore']);
                Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
                Route::post('users/{user}/change-password',[UserController::class, 'changePassword']);
                Route::post('users/{user}/toggle-active',  [UserController::class, 'toggleActive']);
                Route::post('users/{user}/assign-role',    [UserController::class, 'assignRole']);

                // أدوار — كتابة (القراءة في مجموعة ⑤-أ أعلاه)
                Route::post('roles',                       [RoleController::class, 'store']);
                Route::put('roles/{role}',                 [RoleController::class, 'update']);
                Route::patch('roles/{role}',               [RoleController::class, 'update']);
                Route::delete('roles/{role}',              [RoleController::class, 'destroy']);

                // صلاحيات — كتابة
                Route::post('permissions',                 [PermissionController::class, 'store']);
                Route::put('permissions/{permission}',     [PermissionController::class, 'update']);
                Route::patch('permissions/{permission}',   [PermissionController::class, 'update']);
                Route::delete('permissions/{permission}',  [PermissionController::class, 'destroy']);

                // موظفون — كتابة
                Route::post('employees',                   [EmployeeController::class, 'store']);
                Route::put('employees/{employee}',         [EmployeeController::class, 'update']);
                Route::patch('employees/{employee}',       [EmployeeController::class, 'update']);
                Route::delete('employees/{employee}',      [EmployeeController::class, 'destroy']);

                // عقود — كتابة
                Route::post('employment-contracts',                          [EmploymentContractController::class, 'store']);
                Route::put('employment-contracts/{contract}',               [EmploymentContractController::class, 'update']);
                Route::patch('employment-contracts/{contract}',             [EmploymentContractController::class, 'update']);
                Route::delete('employment-contracts/{contract}',            [EmploymentContractController::class, 'destroy']);

                // سنوات مالية — كتابة
                Route::post('fiscal-years',                [FiscalYearController::class, 'store']);
                Route::put('fiscal-years/{year}',          [FiscalYearController::class, 'update']);
                Route::patch('fiscal-years/{year}',        [FiscalYearController::class, 'update']);
                Route::delete('fiscal-years/{year}',       [FiscalYearController::class, 'destroy']);
                Route::post('fiscal-years/{year}/close',   [FiscalYearController::class, 'close']);

                // أرصدة افتتاحية
                Route::apiResource('opening-balance-stocks',  OpeningBalanceStockController::class);
                Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

                // سلاسل الترقيم
                Route::apiResource('numbering-series', NumberingSeriesController::class);
                Route::post('numbering-series/{series}/lock',    [NumberingSeriesController::class, 'lock']);
                Route::post('numbering-series/{series}/unlock',  [NumberingSeriesController::class, 'unlock']);
                Route::get('numbering-series/{series}/next-number',  [NumberingSeriesController::class, 'getNextNumber']);
                Route::get('numbering-series/{series}/preview-next', [NumberingSeriesController::class, 'previewNextNumber']);
                Route::post('numbering-series/{series}/sync',     [NumberingSeriesController::class, 'syncNumber']);

                // تخفيضات الكميات
                Route::apiResource('quantity-discounts', QuantityDiscountController::class);
            });

            // ────────────────────────────────────
            // ⑤-ج: موارد مشتركة بين المالك والمدير والمحاسب
            // ────────────────────────────────────
            Route::middleware('can:manage-commercial-document')->group(function () {
                // مستندات تجارية
                Route::apiResource('documents', CommercialDocumentController::class);
                Route::get('documents/unpaid',                    [CommercialDocumentController::class, 'unpaid']);
                Route::get('documents/overdue',                   [CommercialDocumentController::class, 'overdue']);
                Route::post('documents/{document}/validate',      [CommercialDocumentController::class, 'validateDocument']);
                Route::post('documents/{document}/lock',          [CommercialDocumentController::class, 'lock']);
                Route::post('documents/{document}/unlock',        [CommercialDocumentController::class, 'unlock']);
                Route::post('documents/{document}/cancel',        [CommercialDocumentController::class, 'cancel']);
                Route::get('documents/{document}/qrcode',         [CommercialDocumentController::class, 'generateQRCode']);

                // أسطر المستندات
                Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

                // المدفوعات
                Route::apiResource('payments', PaymentController::class);
                Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
                Route::get('payments/pending',   [PaymentController::class, 'pending']);

                // الشيكات
                Route::apiResource('checks', CheckController::class);
                Route::get('checks/pending',                 [CheckController::class, 'pending']);
                Route::get('checks/overdue',                 [CheckController::class, 'overdue']);
                Route::post('checks/{check}/mark-cleared',   [CheckController::class, 'markAsCleared']);
                Route::post('checks/{check}/mark-bounced',   [CheckController::class, 'markAsBounced']);

                // حسابات الخزينة
                Route::apiResource('treasury-accounts', TreasuryAccountController::class);
                Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
                Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
                Route::get('treasury-accounts/default',       [TreasuryAccountController::class, 'default']);

                // المصروفات
                Route::apiResource('expenses', ExpenseController::class);
                Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
                Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

                // دفعات المنتجات — كتابة
                Route::post('product-lots',                 [ProductLotController::class, 'store']);
                Route::put('product-lots/{lot}',            [ProductLotController::class, 'update']);
                Route::delete('product-lots/{lot}',         [ProductLotController::class, 'destroy']);

                // حركات المخزون — كتابة
                Route::post('stock-movements',              [StockMovementController::class, 'store']);
                Route::delete('stock-movements/{movement}', [StockMovementController::class, 'destroy']);
            });

            // ────────────────────────────────────
            // ⑤-د: موارد فردية (المستخدم نفسه)
            // ────────────────────────────────────
            // مرفقات
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);

            // إعدادات — للجميع (مع Policies تتحكم بالتفاصيل)
            Route::apiResource('settings', SettingController::class);
            Route::get('settings/group/{group}',  [SettingController::class, 'byGroup']);
            Route::get('settings/key/{key}/value', [SettingController::class, 'getValue']);
        });
});
