<?php

use Illuminate\Support\Facades\Route;

// Auth
use App\Http\Controllers\Api\V1\AuthController;

// Company
use App\Http\Controllers\Api\V1\CompanyController;

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

// Lookup Controllers
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
use App\Http\Controllers\Api\V1\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Models\Company;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes (Laravel 11) — Multi-Tenancy
|--------------------------------------------------------------------------
|
| هيكل الـ URL:
|
|   /api/v1/auth/*                        ← مصادقة (عام + محمي)
|   /api/v1/companies/*                   ← إدارة شركات المستخدم
|   /api/v1/admin/companies/*             ← Super Admin فقط
|   /api/v1/{lookups}                     ← جداول البحث المشتركة
|   /api/v1/{company_slug}/{resource}     ← بيانات معزولة حسب الشركة
|
*/

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════
    // ① المصادقة — Auth
    // ═══════════════════════════════════════════

    Route::prefix('auth')->group(function () {
        // بدون حماية
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login',    [AuthController::class, 'login']);

        // محمية
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',              [AuthController::class, 'me']);
            Route::put('/update',          [AuthController::class, 'update']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/logout',         [AuthController::class, 'logout']);
        });
    });

    // ═══════════════════════════════════════════
    // ② إدارة شركات المستخدم
    // ═══════════════════════════════════════════

    Route::middleware('auth:sanctum')->prefix('companies')->group(function () {

        Route::get('/',        [CompanyController::class, 'index']);
        Route::post('/',       function (StoreCompanyRequest $request) {
            return app(CompanyController::class)->store($request);
        });
        Route::get('/current', [CompanyController::class, 'current']);
        Route::post('/switch', [CompanyController::class, 'switch']);

        Route::get('/{company}', function ($company) {
            return app(CompanyController::class)->show($company);
        });
        Route::put('/{company}', function (UpdateCompanyRequest $request, $company) {
            return app(CompanyController::class)->update($request, $company);
        });
        Route::patch('/{company}', function (UpdateCompanyRequest $request, $company) {
            return app(CompanyController::class)->update($request, $company);
        });

        Route::get('/{company}/members', fn(Company $company) => app(CompanyController::class)->members($company));
        Route::post('/{company}/members', fn(Request $request, Company $company) => app(CompanyController::class)->addMember($request, $company));
        Route::delete('/{company}/members/{userId}', fn(Company $company, int $userId) => app(CompanyController::class)->removeMember($company, $userId));
        Route::patch('/{company}/members/{userId}/role', fn(Request $request, Company $company, int $userId) => app(CompanyController::class)->changeMemberRole($request, $company, $userId));
        Route::patch('/{company}/members/{userId}/deactivate', fn(Company $company, int $userId) => app(CompanyController::class)->deactivateMember($company, $userId));
        Route::patch('/{company}/members/{userId}/activate', fn(Company $company, int $userId) => app(CompanyController::class)->activateMember($company, $userId));

        Route::post('/{company}/transfer-ownership', fn(Request $request, Company $company) => app(CompanyController::class)->transferOwnership($request, $company));
    });

    // ═══════════════════════════════════════════
    // ③ Super Admin — إدارة كاملة لكل الشركات
    // ═══════════════════════════════════════════

    Route::middleware(['auth:sanctum', 'role:super-admin'])
        ->prefix('admin/companies')
        ->group(function () {
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

    // ═══════════════════════════════════════════
    // ④ Lookup Tables — مشتركة بين كل الشركات
    // ═══════════════════════════════════════════
    //
    // هذه الجداول بدون company_id — بيانات عامة يستفيد منها الجميع.
    // currencies, wilayas, communes → مرجعية جغرافية وعملات
    // units, tvas, price-levels, brands, families → كتالوج مشترك
    //
    // ملاحظة: إذا احتجت لاحقاً أن تكون families/brands per-company،
    // انقلها لقسم Tenant Resources وأضف company_id لجداولها.

    Route::middleware('auth:sanctum')->group(function () {

        // مرجعيات الموقع
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);


        // مرجعيات الأشخاص
        Route::apiResource('genders',     GenderController::class)->only(['index', 'show']);
        Route::apiResource('legal-forms', LegalFormController::class)->only(['index', 'show']);

        // عملات وأسعار الصرف
        Route::apiResource('currencies',     CurrencyController::class);
        Route::apiResource('exchange-rates', ExchangeRateController::class);
        Route::get('exchange-rates/latest',  [ExchangeRateController::class, 'latest']);

        // منتجات — كتالوج مشترك
        Route::apiResource('families', FamilyController::class);
        Route::apiResource('brands',   BrandController::class);
        Route::apiResource('units',    UnitController::class);
        Route::apiResource('tvas',     TvaController::class);
        Route::get('tvas/default',     [TvaController::class, 'default']);

        // أسعار وخصومات
        Route::apiResource('price-levels', PriceLevelController::class);

        // مستندات وتجارة
        Route::apiResource('document-types',           DocumentTypeController::class)->only(['index', 'show']);
        Route::apiResource('document-statuses',        DocumentStatusController::class);
        Route::apiResource('document-base-operations', DocumentBaseOperationController::class)->only(['index', 'show']);
        Route::apiResource('payment-modes',            PaymentModeController::class);
        Route::get('payment-modes/active',             [PaymentModeController::class, 'active']);
        Route::apiResource('fiscal-stamps',            FiscalStampController::class);

        // مخزون
        Route::apiResource('stock-movement-types',         StockMovementTypeController::class)->only(['index', 'show']);
        Route::apiResource('inventory-valuation-methods',  InventoryValuationMethodController::class)->only(['index', 'show']);
        Route::apiResource('product-types',                ProductTypeController::class)->only(['index', 'show']);

        // أطراف
        Route::apiResource('party-types',             PartyTypeController::class)->only(['index', 'show']);

        // مالية
        Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class)->only(['index', 'show']);

        // مصروفات
        Route::apiResource('expense-categories', ExpenseCategoryController::class);
        Route::get('expense-categories/roots',   [ExpenseCategoryController::class, 'roots']);

        // صلاحيات وأدوار (Super Admin فقط يكتب — الجميع يقرأ)
        Route::get('roles',                        [RoleController::class, 'index']);
        Route::get('roles/{role}',                 [RoleController::class, 'show']);
        Route::middleware('role:super-admin')->group(function () {
            Route::post('roles',               [RoleController::class, 'store']);
            Route::put('roles/{role}',         [RoleController::class, 'update']);
            Route::delete('roles/{role}',      [RoleController::class, 'destroy']);
        });

        Route::get('permissions',          [PermissionController::class, 'index']);
        Route::get('permissions/by-group', [PermissionController::class, 'byGroup']);
        Route::get('permissions/{permission}', [PermissionController::class, 'show']);
    });

    // ═══════════════════════════════════════════
    // ⑤ Tenant Resources — معزولة بـ company_slug
    // ═══════════════════════════════════════════
    //
    // كل route هنا يمر بـ middleware 'company':
    //   → يجلب الشركة بالـ slug
    //   → يتحقق من عضوية المستخدم
    //   → يضبط CompanyContextService (company_id)
    //   → HasCompany Global Scope يفلتر تلقائياً

    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            // ── لوحة التحكم ──
            Route::get('dashboard',                       [DashboardController::class, 'index']);
            Route::get('dashboard/sales-chart',           [DashboardController::class, 'salesChart']);
            Route::get('dashboard/top-products',          [DashboardController::class, 'topProducts']);
            Route::get('dashboard/top-customers',         [DashboardController::class, 'topCustomers']);
            Route::get('dashboard/recent-transactions',   [DashboardController::class, 'recentTransactions']);
            Route::get('dashboard/inventory',             [DashboardController::class, 'inventory']);

            // ── التقارير ──
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

            // ── الأطراف (عملاء / موردون) ──
            Route::apiResource('parties', PartyController::class);
            Route::get('customers', [PartyController::class, 'customers']);
            Route::get('suppliers', [PartyController::class, 'suppliers']);

            // ── المنتجات ──
            Route::apiResource('products', ProductController::class);
            Route::get('products/active',             [ProductController::class, 'active']);
            Route::get('products/by-family/{family}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',   [ProductController::class, 'byBrand']);

            // ── الباركود ──
            Route::apiResource('barcodes', BarcodeController::class);
            Route::get('products/{product}/barcodes', [BarcodeController::class, 'indexByProduct']);

            // ── متغيرات المنتج ──
            Route::apiResource('product-variants', ProductVariantController::class);
            Route::get('products/{product}/variants', [ProductVariantController::class, 'indexByProduct']);

            // ── المستودعات ──
            Route::apiResource('warehouses', WarehouseController::class);

            // ── المستندات التجارية ──
            Route::apiResource('documents', CommercialDocumentController::class);
            Route::get('documents/unpaid',               [CommercialDocumentController::class, 'unpaid']);
            Route::get('documents/overdue',              [CommercialDocumentController::class, 'overdue']);
            Route::post('documents/{document}/validate', [CommercialDocumentController::class, 'validateDocument']);
            Route::post('documents/{document}/lock',     [CommercialDocumentController::class, 'lock']);
            Route::post('documents/{document}/unlock',   [CommercialDocumentController::class, 'unlock']);
            Route::post('documents/{document}/cancel',   [CommercialDocumentController::class, 'cancel']);
            Route::get('documents/{document}/qrcode',    [CommercialDocumentController::class, 'generateQRCode']);

            // ── أسطر المستندات ──
            Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

            // ── سلاسل الترقيم ──
            Route::apiResource('numbering-series', NumberingSeriesController::class);
            Route::post('numbering-series/{series}/lock',         [NumberingSeriesController::class, 'lock']);
            Route::post('numbering-series/{series}/unlock',       [NumberingSeriesController::class, 'unlock']);
            Route::get('numbering-series/{series}/next-number',   [NumberingSeriesController::class, 'getNextNumber']);
            Route::get('numbering-series/{series}/preview-next',  [NumberingSeriesController::class, 'previewNextNumber']);
            Route::post('numbering-series/{series}/sync',         [NumberingSeriesController::class, 'syncNumber']);

            // ── الأرصدة الافتتاحية ──
            Route::apiResource('opening-balance-stocks',   OpeningBalanceStockController::class);
            Route::apiResource('opening-balance-parties',  OpeningBalancePartyController::class);

            // ── الشيكات ──
            Route::apiResource('checks', CheckController::class);
            Route::get('checks/pending',                    [CheckController::class, 'pending']);
            Route::get('checks/overdue',                    [CheckController::class, 'overdue']);
            Route::post('checks/{check}/mark-cleared',      [CheckController::class, 'markAsCleared']);
            Route::post('checks/{check}/mark-bounced',      [CheckController::class, 'markAsBounced']);

            // ── الحسابات الخزينة ──
            Route::apiResource('treasury-accounts', TreasuryAccountController::class);
            Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
            Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
            Route::get('treasury-accounts/default',       [TreasuryAccountController::class, 'default']);

            // ── تخفيضات الكميات ──
            Route::apiResource('quantity-discounts', QuantityDiscountController::class);

            // ── المصروفات ──
            Route::apiResource('expenses', ExpenseController::class);
            Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
            Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

            // ── دفعات المنتجات (Lots) ──
            Route::apiResource('product-lots', ProductLotController::class);
            Route::get('product-lots/available', [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring',  [ProductLotController::class, 'expiring']);

            // ── السنوات المالية ──
            Route::apiResource('fiscal-years', FiscalYearController::class);
            Route::get('fiscal-years/current',          [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',             [FiscalYearController::class, 'open']);
            Route::post('fiscal-years/{year}/close',    [FiscalYearController::class, 'close']);

            // ── الدفعات ──
            Route::apiResource('payments', PaymentController::class);
            Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
            Route::get('payments/pending',   [PaymentController::class, 'pending']);

            // ── حركات المخزون ──
            Route::apiResource('stock-movements', StockMovementController::class);
            Route::get('stock-movements/incoming', [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing', [StockMovementController::class, 'outgoing']);

            // ── المرفقات ──
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);

            // ── الموظفون ──
            Route::apiResource('employees', EmployeeController::class);
            Route::get('employees/active', [EmployeeController::class, 'active']);
            Route::apiResource('employment-contracts', EmploymentContractController::class);
            Route::get(
                'employment-contracts/employee/{employee}/active',
                [EmploymentContractController::class, 'active']
            );

            // ── الإشعارات ──
            Route::apiResource('notifications', NotificationController::class);
            Route::get('notifications/unread',                   [NotificationController::class, 'unread']);
            Route::post('notifications/{notification}/mark-read', [NotificationController::class, 'markAsRead']);
            Route::post('notifications/mark-all-read',           [NotificationController::class, 'markAllAsRead']);

            // ── الإعدادات ──
            Route::apiResource('settings', SettingController::class);
            Route::get('settings/group/{group}',  [SettingController::class, 'byGroup']);
            Route::get('settings/key/{key}/value', [SettingController::class, 'getValue']);

            // ── سجل المراجعة ──
            Route::apiResource('audits', AuditController::class)->only(['index', 'show']);
            Route::get('audits/user/{user}',      [AuditController::class, 'byUser']);
            Route::get('audits/event/{event}',    [AuditController::class, 'byEvent']);


            // إدارة المستخدمين
            Route::apiResource('users', UserController::class);
            Route::get('users/trashed', [UserController::class, 'trashed']);
            Route::post('users/{user}/restore', [UserController::class, 'restore']);
            Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
            Route::post('users/{user}/change-password', [UserController::class, 'changePassword']);
            Route::post('users/{user}/toggle-active', [UserController::class, 'toggleActive']);
            Route::post('users/{user}/assign-role', [UserController::class, 'assignRole']);
            Route::get('users-by-role', [UserController::class, 'byRole']);
            Route::get('users/active', [UserController::class, 'active']);
            Route::get('users/inactive', [UserController::class, 'inactive']);


            Route::get('roles', [RoleController::class, 'index']);
            Route::get('roles/{role}', [RoleController::class, 'show']);

            Route::get('permissions', [PermissionController::class, 'index']);
            Route::get('permissions/by-group', [PermissionController::class, 'byGroup']);
            Route::get('permissions/{permission}', [PermissionController::class, 'show']);
        });
});
