<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\UserController;

// Tenant Resource Controllers
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
use App\Http\Controllers\Api\V1\BarcodeController;
use App\Http\Controllers\Api\V1\CompanySeedController;
use App\Http\Controllers\Api\V1\ProductVariantController;

// Tenant Lookup Controllers
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\PriceLevelController;
use App\Http\Controllers\Api\V1\PaymentModeController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\ExchangeRateController;

// Global Lookup Controllers
use App\Http\Controllers\Api\V1\WilayaController;
use App\Http\Controllers\Api\V1\CommuneController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\DocumentBaseOperationController;
use App\Http\Controllers\Api\V1\DocumentStatusController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\FiscalStampController;
use App\Http\Controllers\Api\V1\GenderController;
use App\Http\Controllers\Api\V1\InventoryValuationMethodController;
use App\Http\Controllers\Api\V1\LegalFormController;
use App\Http\Controllers\Api\V1\PartyTypeController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\ProductTypeController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\StockMovementTypeController;
use App\Http\Controllers\Api\V1\TreasuryAccountTypeController;
use App\Http\Controllers\Api\V1\TvaController;

use App\Models\Company;
use Illuminate\Http\Request;

/*
| API Routes (Laravel 11) — Multi-Tenancy Professional Structure
|--------------------------------------------------------------------------
| ① /api/v1/auth/*
| ② /api/v1/companies/*
| ③ /api/v1/admin/*               ← in api_admin.php
| ④ /api/v1/lookups/*             ← wilayas, communes only
| ⑤ /api/v1/{company}/{resource}  ← tenant data
*/

require base_path('routes/api_admin.php');

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════
    // ① AUTH — مع Rate Limiting على المسارات الحساسة
    // ═══════════════════════════════════════════
    Route::prefix('auth')->group(function () {
        // 🔒 تسجيل وتسجيل دخول — حد أقصى 5 محاولات / 15 دقيقة
        Route::post('/register', [AuthController::class, 'register'])
            ->middleware('throttle:5,15');
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:5,15');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',               [AuthController::class, 'me']);
            Route::put('/update',           [AuthController::class, 'update']);
            // 🔒 تغيير كلمة المرور — 3 محاولات / ساعة
            Route::post('/change-password', [AuthController::class, 'changePassword'])
                ->middleware('throttle:3,60');
            Route::post('/logout',          [AuthController::class, 'logout']);

            Route::prefix('profile')->group(function () {
                Route::get('/',                   [UserController::class, 'profile']);
                Route::put('/',                   [UserController::class, 'updateProfile']);
                Route::post('/avatar',            [UserController::class, 'updateAvatar']);
                Route::post('/change-password',   [AuthController::class, 'changePassword'])
                    ->middleware('throttle:3,60');
            });
        });
    });

    // ═══════════════════════════════════════════
    // ② USER COMPANIES
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->prefix('companies')->group(function () {
        Route::get('/current', [CompanyController::class, 'current']);
        Route::post('/switch', [CompanyController::class, 'switch']);

        Route::get('/',  [CompanyController::class, 'index']);
        Route::post('/', [CompanyController::class, 'store']);

        Route::get('/{company}',    [CompanyController::class, 'show']);
        Route::put('/{company}',    [CompanyController::class, 'update']);
        Route::patch('/{company}',  [CompanyController::class, 'update']);
        Route::delete('/{company}', [CompanyController::class, 'destroy']);

        Route::post('/{company}/suspend',   [CompanyController::class, 'suspend']);
        Route::post('/{company}/unsuspend', [CompanyController::class, 'unsuspend']);
        Route::post('/{company}/verify',    [CompanyController::class, 'verify']);
        Route::post('/{company}/unverify',  [CompanyController::class, 'unverify']);
        Route::patch('/{company}/plan',     [CompanyController::class, 'upgradePlan']);

        Route::get(
            '/{company}/members',
            fn(Company $company) => app(CompanyController::class)->members($company)
        );
        Route::post(
            '/{company}/members',
            fn(Request $request, Company $company) => app(CompanyController::class)->addMember($request, $company)
        );
        Route::delete(
            '/{company}/members/{userId}',
            fn(Company $company, int $userId) => app(CompanyController::class)->removeMember($company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/role',
            fn(Request $request, Company $company, int $userId) => app(CompanyController::class)->changeMemberRole($request, $company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/deactivate',
            fn(Company $company, int $userId) => app(CompanyController::class)->deactivateMember($company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/activate',
            fn(Company $company, int $userId) => app(CompanyController::class)->activateMember($company, $userId)
        );
        Route::post(
            '/{company}/transfer-ownership',
            fn(Request $request, Company $company) => app(CompanyController::class)->transferOwnership($request, $company)
        );
    });

    // ═══════════════════════════════════════════
    // ③ SUPER ADMIN (api_admin.php)
    // ═══════════════════════════════════════════

    // ═══════════════════════════════════════════
    // ④ GLOBAL LOOKUPS (only wilayas, communes)
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);
    });

    // ═══════════════════════════════════════════
    // ⑤ TENANT RESOURCES
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            Route::post('seeds/{seeder}', [CompanySeedController::class, 'run']);

            // ── ⑤-أ: لكل أعضاء الشركة (قراءة) ──────────
            Route::get('dashboard',                     [DashboardController::class, 'index']);
            Route::get('dashboard/sales-chart',         [DashboardController::class, 'salesChart']);
            Route::get('dashboard/top-products',        [DashboardController::class, 'topProducts']);
            Route::get('dashboard/top-customers',       [DashboardController::class, 'topCustomers']);
            Route::get('dashboard/recent-transactions', [DashboardController::class, 'recentTransactions']);
            Route::get('dashboard/inventory',           [DashboardController::class, 'inventory']);

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

            // جداول مرجعية (قراءة)
            Route::apiResource('families',       FamilyController::class)->only(['index', 'show']);
            Route::apiResource('brands',         BrandController::class)->only(['index', 'show']);
            Route::apiResource('units',          UnitController::class)->only(['index', 'show']);
            Route::apiResource('price-levels',   PriceLevelController::class)->only(['index', 'show']);
            Route::apiResource('payment-modes',  PaymentModeController::class)->only(['index', 'show']);
            Route::get('payment-modes/active',   [PaymentModeController::class, 'active']);
            Route::apiResource('exchange-rates', ExchangeRateController::class)->only(['index', 'show']);
            Route::get('exchange-rates/latest',  [ExchangeRateController::class, 'latest']);
            Route::apiResource('expense-categories', ExpenseCategoryController::class)->only(['index', 'show']);
            Route::get('expense-categories/roots',   [ExpenseCategoryController::class, 'roots']);

            Route::apiResource('tvas', TvaController::class)->only(['index', 'show']);
            Route::get('tvas/default', [TvaController::class, 'default']);

            Route::apiResource('document-types',           DocumentTypeController::class)->only(['index', 'show']);
            Route::apiResource('document-statuses',        DocumentStatusController::class)->only(['index', 'show']);
            Route::apiResource('document-base-operations', DocumentBaseOperationController::class)->only(['index', 'show']);
            Route::apiResource('fiscal-stamps',            FiscalStampController::class)->only(['index', 'show']);

            Route::apiResource('genders',     GenderController::class)->only(['index', 'show']);
            Route::apiResource('legal-forms', LegalFormController::class)->only(['index', 'show']);
            Route::apiResource('currencies',  CurrencyController::class)->only(['index', 'show']);

            Route::apiResource('party-types',               PartyTypeController::class)->only(['index', 'show']);
            Route::apiResource('product-types',             ProductTypeController::class)->only(['index', 'show']);
            Route::apiResource('treasury-account-types',    TreasuryAccountTypeController::class)->only(['index', 'show']);
            Route::apiResource('stock-movement-types',      StockMovementTypeController::class)->only(['index', 'show']);
            Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class)->only(['index', 'show']);

            // منتجات وأطراف ومستودعات (قراءة)
            Route::get('products',                    [ProductController::class, 'index']);
            Route::get('products/active',             [ProductController::class, 'active']);
            Route::get('products/by-family/{family}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',   [ProductController::class, 'byBrand']);
            Route::get('products/{product}',          [ProductController::class, 'show']);

            Route::get('product-variants',              [ProductVariantController::class, 'index']);
            Route::get('product-variants/{variant}',    [ProductVariantController::class, 'show']);
            Route::get('products/{product}/variants',   [ProductVariantController::class, 'indexByProduct']);

            Route::get('barcodes',                    [BarcodeController::class, 'index']);
            Route::get('barcodes/{barcode}',          [BarcodeController::class, 'show']);
            Route::get('products/{product}/barcodes', [BarcodeController::class, 'indexByProduct']);

            Route::get('warehouses',             [WarehouseController::class, 'index']);
            Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show']);

            Route::get('parties',         [PartyController::class, 'index']);
            Route::get('parties/{party}', [PartyController::class, 'show']);
            Route::get('customers',       [PartyController::class, 'customers']);
            Route::get('suppliers',       [PartyController::class, 'suppliers']);

            // ✅ product-lots: المسارات المحددة قبل المورد لتجنب conflict
            Route::get('product-lots/available', [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring',  [ProductLotController::class, 'expiring']);
            Route::get('product-lots',           [ProductLotController::class, 'index']);
            Route::get('product-lots/{lot}',     [ProductLotController::class, 'show']);

            Route::get('employees/active',     [EmployeeController::class, 'active']);
            Route::get('employees',            [EmployeeController::class, 'index']);
            Route::get('employees/{employee}', [EmployeeController::class, 'show']);

            Route::get('employment-contracts',                            [EmploymentContractController::class, 'index']);
            Route::get('employment-contracts/{contract}',                 [EmploymentContractController::class, 'show']);
            Route::get('employment-contracts/employee/{employee}/active', [EmploymentContractController::class, 'active']);

            // ✅ stock-movements: المسارات المحددة قبل المورد
            Route::get('stock-movements/incoming',   [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing',   [StockMovementController::class, 'outgoing']);
            Route::get('stock-movements',            [StockMovementController::class, 'index']);
            Route::get('stock-movements/{movement}', [StockMovementController::class, 'show']);

            // ✅ fiscal-years: المسارات المحددة قبل المورد
            Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',    [FiscalYearController::class, 'open']);
            Route::get('fiscal-years',         [FiscalYearController::class, 'index']);
            Route::get('fiscal-years/{year}',  [FiscalYearController::class, 'show']);

            Route::get('roles',                    [RoleController::class, 'index']);
            Route::get('roles/{role}',             [RoleController::class, 'show']);
            Route::get('permissions/by-group',     [PermissionController::class, 'byGroup']);
            Route::get('permissions',              [PermissionController::class, 'index']);
            Route::get('permissions/{permission}', [PermissionController::class, 'show']);

            // ✅ notifications: المسارات المحددة قبل المورد
            Route::get('notifications/unread',                       [NotificationController::class, 'unread']);
            Route::get('notifications',                              [NotificationController::class, 'index']);
            Route::get('notifications/{notification}',               [NotificationController::class, 'show']);
            Route::post('notifications/{notification}/mark-read',    [NotificationController::class, 'markAsRead']);
            Route::post('notifications/mark-all-read',               [NotificationController::class, 'markAllAsRead']);

            Route::get('audits',               [AuditController::class, 'index']);
            Route::get('audits/{audit}',       [AuditController::class, 'show']);
            Route::get('audits/user/{user}',   [AuditController::class, 'byUser']);
            Route::get('audits/event/{event}', [AuditController::class, 'byEvent']);

            Route::prefix('me')->group(function () {
                Route::get('/',                 [UserController::class, 'profile']);
                Route::put('/',                 [UserController::class, 'updateProfile']);
                Route::post('/avatar',          [UserController::class, 'updateAvatar']);
                Route::post('/change-password', [AuthController::class, 'changePassword']);
            });

            // ── ⑤-ب: للمالك/المدير (كتابة) ──────────────────
            Route::middleware('can:update_company')->group(function () {

                // جداول مرجعية - كتابة
                Route::apiResource('units',                  UnitController::class,                  ['except' => ['index', 'show']]);
                Route::apiResource('families',               FamilyController::class,                ['except' => ['index', 'show']]);
                Route::apiResource('brands',                 BrandController::class,                 ['except' => ['index', 'show']]);
                Route::apiResource('price-levels',           PriceLevelController::class,            ['except' => ['index', 'show']]);
                Route::apiResource('payment-modes',          PaymentModeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('exchange-rates',         ExchangeRateController::class,          ['except' => ['index', 'show']]);
                Route::apiResource('expense-categories',     ExpenseCategoryController::class,       ['except' => ['index', 'show']]);
                Route::apiResource('tvas',                   TvaController::class,                   ['except' => ['index', 'show']]);
                Route::apiResource('document-types',         DocumentTypeController::class,          ['except' => ['index', 'show']]);
                Route::apiResource('document-statuses',      DocumentStatusController::class,        ['except' => ['index', 'show']]);
                Route::apiResource('document-base-operations', DocumentBaseOperationController::class, ['except' => ['index', 'show']]);
                Route::apiResource('fiscal-stamps',          FiscalStampController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('genders',                GenderController::class,                ['except' => ['index', 'show']]);
                Route::apiResource('legal-forms',            LegalFormController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('currencies',             CurrencyController::class,              ['except' => ['index', 'show']]);
                Route::apiResource('party-types',            PartyTypeController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('product-types',          ProductTypeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class,  ['except' => ['index', 'show']]);
                Route::apiResource('stock-movement-types',   StockMovementTypeController::class,     ['except' => ['index', 'show']]);
                Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class, ['except' => ['index', 'show']]);

                // منتجات وأطراف ومستودعات - كتابة
                Route::apiResource('products',          ProductController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('barcodes',          BarcodeController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('product-variants',  ProductVariantController::class,      ['except' => ['index', 'show']]);
                Route::apiResource('warehouses',        WarehouseController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('parties',           PartyController::class,               ['except' => ['index', 'show']]);

                // مستخدمون (بصلاحيات كاملة)
                // ✅ المسارات المحددة قبل apiResource لتجنب conflict
                Route::get('users/trashed',                [UserController::class, 'trashed']);
                Route::get('users/active',                 [UserController::class, 'active']);
                Route::get('users/inactive',               [UserController::class, 'inactive']);
                Route::get('users-by-role',                [UserController::class, 'byRole']);
                Route::apiResource('users', UserController::class);
                Route::post('users/{user}/restore',        [UserController::class, 'restore']);
                Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
                Route::post('users/{user}/change-password', [UserController::class, 'changePassword']);
                Route::post('users/{user}/toggle-active',  [UserController::class, 'toggleActive']);
                Route::post('users/{user}/assign-role',    [UserController::class, 'assignRole']);

                // أدوار وصلاحيات
                Route::apiResource('roles',               RoleController::class,               ['except' => ['index', 'show']]);
                Route::apiResource('permissions',         PermissionController::class,         ['except' => ['index', 'show']]);

                // موظفون وعقود
                Route::apiResource('employees',             EmployeeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('employment-contracts',  EmploymentContractController::class, ['except' => ['index', 'show']]);

                // أرصدة افتتاحية
                Route::apiResource('opening-balance-stocks',  OpeningBalanceStockController::class);
                Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

                // سلاسل الترقيم
                Route::apiResource('numbering-series', NumberingSeriesController::class);
                Route::post('numbering-series/{series}/lock',        [NumberingSeriesController::class, 'lock']);
                Route::post('numbering-series/{series}/unlock',      [NumberingSeriesController::class, 'unlock']);
                Route::get('numbering-series/{series}/next-number',  [NumberingSeriesController::class, 'getNextNumber']);
                Route::get('numbering-series/{series}/preview-next', [NumberingSeriesController::class, 'previewNextNumber']);
                Route::post('numbering-series/{series}/sync',        [NumberingSeriesController::class, 'syncNumber']);

                // تخفيضات الكميات
                Route::apiResource('quantity-discounts', QuantityDiscountController::class);
            });

            // ── ⑤-ب-٢: السنوات المالية (manage_fiscal_year) ─────
            Route::middleware('can:manage_fiscal_year')->group(function () {
                Route::post('fiscal-years',              [FiscalYearController::class, 'store']);
                Route::put('fiscal-years/{year}',        [FiscalYearController::class, 'update']);
                Route::patch('fiscal-years/{year}',      [FiscalYearController::class, 'update']);
                Route::delete('fiscal-years/{year}',     [FiscalYearController::class, 'destroy']);
                Route::post('fiscal-years/{year}/close', [FiscalYearController::class, 'close']);
            });

            // ── ⑤-ج: للمالك والمدير والمحاسب ──────────────────
            Route::middleware('can:create_sales_document')->group(function () {

                // ✅ المسارات المحددة (unpaid, overdue) يجب أن تكون
                //    قبل apiResource — وإلا Laravel يعترضها كـ {document}
                Route::get('documents/unpaid',  [CommercialDocumentController::class, 'unpaid']);
                Route::get('documents/overdue', [CommercialDocumentController::class, 'overdue']);

                // ✅ apiResource بعد المسارات المحددة
                Route::apiResource('documents', CommercialDocumentController::class);

                // مسارات الإجراءات على الوثيقة
                Route::post('documents/{document}/validate', [CommercialDocumentController::class, 'validateDocument']);
                Route::post('documents/{document}/lock',     [CommercialDocumentController::class, 'lock']);
                Route::post('documents/{document}/unlock',   [CommercialDocumentController::class, 'unlock']);
                Route::post('documents/{document}/cancel',   [CommercialDocumentController::class, 'cancel']);
                Route::get('documents/{document}/qrcode',   [CommercialDocumentController::class, 'generateQRCode']);

                Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

                // ✅ payments: المسارات المحددة قبل apiResource
                Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
                Route::get('payments/pending',   [PaymentController::class, 'pending']);
                Route::apiResource('payments', PaymentController::class);

                // ✅ checks: المسارات المحددة قبل apiResource
                Route::get('checks/pending',               [CheckController::class, 'pending']);
                Route::get('checks/overdue',               [CheckController::class, 'overdue']);
                Route::apiResource('checks', CheckController::class);
                Route::post('checks/{check}/mark-cleared', [CheckController::class, 'markAsCleared']);
                Route::post('checks/{check}/mark-bounced', [CheckController::class, 'markAsBounced']);

                // ✅ treasury-accounts: المسارات المحددة قبل apiResource
                Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
                Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
                Route::get('treasury-accounts/default',       [TreasuryAccountController::class, 'default']);
                Route::apiResource('treasury-accounts', TreasuryAccountController::class);

                // ✅ expenses: المسارات المحددة قبل apiResource
                Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
                Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);
                Route::apiResource('expenses', ExpenseController::class);

                Route::post('product-lots',         [ProductLotController::class, 'store']);
                Route::put('product-lots/{lot}',    [ProductLotController::class, 'update']);
                Route::delete('product-lots/{lot}', [ProductLotController::class, 'destroy']);

                Route::post('stock-movements',              [StockMovementController::class, 'store']);
                Route::delete('stock-movements/{movement}', [StockMovementController::class, 'destroy']);
            });

            // ── ⑤-د: فردية (المستخدم نفسه) ─────────────────────
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);

            // ✅ settings: المسارات المحددة قبل apiResource
 // ① المسارات المحددة أولاً (قبل أي {wildcard})
Route::get('settings/group/{group}',   [SettingController::class, 'byGroup']);
Route::get('settings/{key}',           [SettingController::class, 'getValue']);

// ② العمليات الجماعية على /settings (بدون ID)
Route::get('settings',                 [SettingController::class, 'index']);
Route::patch('settings',               [SettingController::class, 'update']);
Route::put('settings',                 [SettingController::class, 'update']);
            // جلب الملف الشخصي للمستخدم المسجل
            Route::get('/profile',          [UserController::class, 'profile']);

            // تحديث المعلومات الشخصية
            Route::put('/profile',          [UserController::class, 'updateProfile']);

            // تغيير كلمة المرور
            Route::put('/profile/password', [UserController::class, 'changeMyPassword']);

            // رفع الصورة الشخصية
            Route::post('/profile/avatar',  [UserController::class, 'uploadAvatar']);
        });
});
