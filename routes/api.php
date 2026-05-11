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

// Tenant Lookup Controllers (نُقلت من العامة إلى هنا)
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\PriceLevelController;
use App\Http\Controllers\Api\V1\PaymentModeController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\ExchangeRateController;

// Global Lookup Controllers (بقيت عالمية لأنها لا تحمل company_id)
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
|
| ① /api/v1/auth/*                     ← المصادقة
| ② /api/v1/companies/*                ← إدارة شركات المستخدم
| ③ /api/v1/admin/*                    ← Super Admin (في api_admin.php)
| ④ /api/v1/lookups/*                  ← جداول مرجعية عالمية حقيقية (wilayas, communes)
| ⑤ /api/v1/{company}/{resource}       ← بيانات معزولة بالشركة (جميع جداول company_id)
|
*/


require base_path('routes/api_admin.php');

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════
    // ① AUTH — المصادقة + الملف الشخصي
    // ═══════════════════════════════════════════
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login',    [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',               [AuthController::class, 'me']);
            Route::put('/update',           [AuthController::class, 'update']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/logout',          [AuthController::class, 'logout']);

            Route::prefix('profile')->group(function () {
                Route::get('/',                   [UserController::class, 'profile']);
                Route::put('/',                   [UserController::class, 'updateProfile']);
                Route::post('/avatar',            [UserController::class, 'updateAvatar']);
                Route::post('/change-password',   [AuthController::class, 'changePassword']);
            });
        });
    });

    // ═══════════════════════════════════════════
    // ② USER COMPANIES — إدارة شركات المستخدم
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
    // ③ SUPER ADMIN — api_admin.php
    // ═══════════════════════════════════════════

    // ═══════════════════════════════════════════
    // ④ LOOKUP TABLES — فقط العالمية الحقيقية
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);
    });

    // ═══════════════════════════════════════════
    // ⑤ TENANT RESOURCES — معزولة بـ company
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            Route::post('seeds/{seeder}', [CompanySeedController::class, 'run']);

            // ── ⑤-أ: موارد لكل أعضاء الشركة (قراءة) ──────────
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

            // --- جداول مرجعية خاصة بالشركة (كانت عالمية سابقاً) ---
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
            Route::get('products/{product}',          [ProductController::class, 'show']);
            Route::get('products/active',             [ProductController::class, 'active']);
            Route::get('products/by-family/{family}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',   [ProductController::class, 'byBrand']);

            Route::get('product-variants',              [ProductVariantController::class, 'index']);
            Route::get('product-variants/{variant}',    [ProductVariantController::class, 'show']);
            Route::get('products/{product}/variants',   [ProductVariantController::class, 'indexByProduct']);

            Route::get('barcodes',                    [BarcodeController::class, 'index']);
            Route::get('barcodes/{barcode}',          [BarcodeController::class, 'show']);
            Route::get('products/{product}/barcodes', [BarcodeController::class, 'indexByProduct']);

            Route::get('warehouses',           [WarehouseController::class, 'index']);
            Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show']);

            Route::get('parties',         [PartyController::class, 'index']);
            Route::get('parties/{party}', [PartyController::class, 'show']);
            Route::get('customers',       [PartyController::class, 'customers']);
            Route::get('suppliers',       [PartyController::class, 'suppliers']);

            Route::get('product-lots',           [ProductLotController::class, 'index']);
            Route::get('product-lots/{lot}',     [ProductLotController::class, 'show']);
            Route::get('product-lots/available', [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring',  [ProductLotController::class, 'expiring']);

            Route::get('employees',            [EmployeeController::class, 'index']);
            Route::get('employees/{employee}', [EmployeeController::class, 'show']);
            Route::get('employees/active',     [EmployeeController::class, 'active']);

            Route::get('employment-contracts',                            [EmploymentContractController::class, 'index']);
            Route::get('employment-contracts/{contract}',                 [EmploymentContractController::class, 'show']);
            Route::get('employment-contracts/employee/{employee}/active', [EmploymentContractController::class, 'active']);

            Route::get('stock-movements',            [StockMovementController::class, 'index']);
            Route::get('stock-movements/{movement}', [StockMovementController::class, 'show']);
            Route::get('stock-movements/incoming',   [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing',   [StockMovementController::class, 'outgoing']);

            Route::get('fiscal-years',         [FiscalYearController::class, 'index']);
            Route::get('fiscal-years/{year}',  [FiscalYearController::class, 'show']);
            Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',    [FiscalYearController::class, 'open']);

            Route::get('roles',                   [RoleController::class, 'index']);
            Route::get('roles/{role}',            [RoleController::class, 'show']);
            Route::get('permissions',             [PermissionController::class, 'index']);
            Route::get('permissions/by-group',    [PermissionController::class, 'byGroup']);
            Route::get('permissions/{permission}',[PermissionController::class, 'show']);

            Route::get('notifications',                              [NotificationController::class, 'index']);
            Route::get('notifications/{notification}',               [NotificationController::class, 'show']);
            Route::get('notifications/unread',                       [NotificationController::class, 'unread']);
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
                Route::post('units',           [UnitController::class, 'store']);
                Route::put('units/{unit}',     [UnitController::class, 'update']);
                Route::patch('units/{unit}',   [UnitController::class, 'update']);
                Route::delete('units/{unit}',  [UnitController::class, 'destroy']);

                Route::post('families',             [FamilyController::class, 'store']);
                Route::put('families/{family}',     [FamilyController::class, 'update']);
                Route::patch('families/{family}',   [FamilyController::class, 'update']);
                Route::delete('families/{family}',  [FamilyController::class, 'destroy']);

                Route::post('brands',           [BrandController::class, 'store']);
                Route::put('brands/{brand}',    [BrandController::class, 'update']);
                Route::patch('brands/{brand}',  [BrandController::class, 'update']);
                Route::delete('brands/{brand}', [BrandController::class, 'destroy']);

                Route::post('price-levels',               [PriceLevelController::class, 'store']);
                Route::put('price-levels/{priceLevel}',   [PriceLevelController::class, 'update']);
                Route::patch('price-levels/{priceLevel}', [PriceLevelController::class, 'update']);
                Route::delete('price-levels/{priceLevel}', [PriceLevelController::class, 'destroy']);

                Route::post('payment-modes',                [PaymentModeController::class, 'store']);
                Route::put('payment-modes/{paymentMode}',   [PaymentModeController::class, 'update']);
                Route::patch('payment-modes/{paymentMode}', [PaymentModeController::class, 'update']);
                Route::delete('payment-modes/{paymentMode}', [PaymentModeController::class, 'destroy']);

                Route::post('exchange-rates',                 [ExchangeRateController::class, 'store']);
                Route::put('exchange-rates/{exchangeRate}',   [ExchangeRateController::class, 'update']);
                Route::patch('exchange-rates/{exchangeRate}', [ExchangeRateController::class, 'update']);
                Route::delete('exchange-rates/{exchangeRate}', [ExchangeRateController::class, 'destroy']);

                Route::post('expense-categories',               [ExpenseCategoryController::class, 'store']);
                Route::put('expense-categories/{category}',     [ExpenseCategoryController::class, 'update']);
                Route::patch('expense-categories/{category}',   [ExpenseCategoryController::class, 'update']);
                Route::delete('expense-categories/{category}',  [ExpenseCategoryController::class, 'destroy']);

                Route::post('tvas',         [TvaController::class, 'store']);
                Route::put('tvas/{tva}',    [TvaController::class, 'update']);
                Route::patch('tvas/{tva}',  [TvaController::class, 'update']);
                Route::delete('tvas/{tva}', [TvaController::class, 'destroy']);

                Route::post('document-types',               [DocumentTypeController::class, 'store']);
                Route::put('document-types/{documentType}', [DocumentTypeController::class, 'update']);
                Route::patch('document-types/{documentType}', [DocumentTypeController::class, 'update']);
                Route::delete('document-types/{documentType}', [DocumentTypeController::class, 'destroy']);

                Route::post('document-statuses',                  [DocumentStatusController::class, 'store']);
                Route::put('document-statuses/{documentStatus}',  [DocumentStatusController::class, 'update']);
                Route::patch('document-statuses/{documentStatus}',[DocumentStatusController::class, 'update']);
                Route::delete('document-statuses/{documentStatus}',[DocumentStatusController::class, 'destroy']);

                Route::post('document-base-operations',                       [DocumentBaseOperationController::class, 'store']);
                Route::put('document-base-operations/{documentBaseOperation}', [DocumentBaseOperationController::class, 'update']);
                Route::patch('document-base-operations/{documentBaseOperation}', [DocumentBaseOperationController::class, 'update']);
                Route::delete('document-base-operations/{documentBaseOperation}', [DocumentBaseOperationController::class, 'destroy']);

                Route::post('fiscal-stamps',               [FiscalStampController::class, 'store']);
                Route::put('fiscal-stamps/{fiscalStamp}',  [FiscalStampController::class, 'update']);
                Route::patch('fiscal-stamps/{fiscalStamp}',[FiscalStampController::class, 'update']);
                Route::delete('fiscal-stamps/{fiscalStamp}',[FiscalStampController::class, 'destroy']);

                Route::post('genders',          [GenderController::class, 'store']);
                Route::put('genders/{gender}',  [GenderController::class, 'update']);
                Route::patch('genders/{gender}',[GenderController::class, 'update']);
                Route::delete('genders/{gender}',[GenderController::class, 'destroy']);

                Route::post('legal-forms',              [LegalFormController::class, 'store']);
                Route::put('legal-forms/{legalForm}',   [LegalFormController::class, 'update']);
                Route::patch('legal-forms/{legalForm}', [LegalFormController::class, 'update']);
                Route::delete('legal-forms/{legalForm}',[LegalFormController::class, 'destroy']);

                Route::post('currencies',              [CurrencyController::class, 'store']);
                Route::put('currencies/{currency}',    [CurrencyController::class, 'update']);
                Route::patch('currencies/{currency}',  [CurrencyController::class, 'update']);
                Route::delete('currencies/{currency}', [CurrencyController::class, 'destroy']);

                Route::post('party-types',                [PartyTypeController::class, 'store']);
                Route::put('party-types/{partyType}',     [PartyTypeController::class, 'update']);
                Route::patch('party-types/{partyType}',   [PartyTypeController::class, 'update']);
                Route::delete('party-types/{partyType}',  [PartyTypeController::class, 'destroy']);

                Route::post('product-types',                [ProductTypeController::class, 'store']);
                Route::put('product-types/{productType}',  [ProductTypeController::class, 'update']);
                Route::patch('product-types/{productType}',[ProductTypeController::class, 'update']);
                Route::delete('product-types/{productType}',[ProductTypeController::class, 'destroy']);

                Route::post('treasury-account-types',                          [TreasuryAccountTypeController::class, 'store']);
                Route::put('treasury-account-types/{treasuryAccountType}',      [TreasuryAccountTypeController::class, 'update']);
                Route::patch('treasury-account-types/{treasuryAccountType}',    [TreasuryAccountTypeController::class, 'update']);
                Route::delete('treasury-account-types/{treasuryAccountType}',   [TreasuryAccountTypeController::class, 'destroy']);

                Route::post('stock-movement-types',                            [StockMovementTypeController::class, 'store']);
                Route::put('stock-movement-types/{stockMovementType}',         [StockMovementTypeController::class, 'update']);
                Route::patch('stock-movement-types/{stockMovementType}',       [StockMovementTypeController::class, 'update']);
                Route::delete('stock-movement-types/{stockMovementType}',      [StockMovementTypeController::class, 'destroy']);

                Route::post('inventory-valuation-methods',                                    [InventoryValuationMethodController::class, 'store']);
                Route::put('inventory-valuation-methods/{inventoryValuationMethod}',           [InventoryValuationMethodController::class, 'update']);
                Route::patch('inventory-valuation-methods/{inventoryValuationMethod}',         [InventoryValuationMethodController::class, 'update']);
                Route::delete('inventory-valuation-methods/{inventoryValuationMethod}',        [InventoryValuationMethodController::class, 'destroy']);

                // منتجات وأطراف ومستودعات - كتابة
                Route::post('products',              [ProductController::class, 'store']);
                Route::put('products/{product}',     [ProductController::class, 'update']);
                Route::patch('products/{product}',   [ProductController::class, 'update']);
                Route::delete('products/{product}',  [ProductController::class, 'destroy']);

                Route::post('barcodes',            [BarcodeController::class, 'store']);
                Route::put('barcodes/{barcode}',   [BarcodeController::class, 'update']);
                Route::delete('barcodes/{barcode}', [BarcodeController::class, 'destroy']);

                Route::post('product-variants',              [ProductVariantController::class, 'store']);
                Route::put('product-variants/{variant}',     [ProductVariantController::class, 'update']);
                Route::patch('product-variants/{variant}',   [ProductVariantController::class, 'update']);
                Route::delete('product-variants/{variant}',  [ProductVariantController::class, 'destroy']);

                Route::post('warehouses',              [WarehouseController::class, 'store']);
                Route::put('warehouses/{warehouse}',   [WarehouseController::class, 'update']);
                Route::patch('warehouses/{warehouse}', [WarehouseController::class, 'update']);
                Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy']);

                Route::post('parties',            [PartyController::class, 'store']);
                Route::put('parties/{party}',     [PartyController::class, 'update']);
                Route::patch('parties/{party}',   [PartyController::class, 'update']);
                Route::delete('parties/{party}',  [PartyController::class, 'destroy']);

                Route::get('users/trashed',                [UserController::class, 'trashed']);
                Route::get('users-by-role',                [UserController::class, 'byRole']);
                Route::get('users/active',                 [UserController::class, 'active']);
                Route::get('users/inactive',               [UserController::class, 'inactive']);
                Route::apiResource('users',                UserController::class);
                Route::post('users/{user}/restore',        [UserController::class, 'restore']);
                Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
                Route::post('users/{user}/change-password', [UserController::class, 'changePassword']);
                Route::post('users/{user}/toggle-active',  [UserController::class, 'toggleActive']);
                Route::post('users/{user}/assign-role',    [UserController::class, 'assignRole']);

                Route::post('roles',              [RoleController::class, 'store']);
                Route::put('roles/{role}',        [RoleController::class, 'update']);
                Route::patch('roles/{role}',      [RoleController::class, 'update']);
                Route::delete('roles/{role}',     [RoleController::class, 'destroy']);

                Route::post('permissions',                [PermissionController::class, 'store']);
                Route::put('permissions/{permission}',    [PermissionController::class, 'update']);
                Route::patch('permissions/{permission}',  [PermissionController::class, 'update']);
                Route::delete('permissions/{permission}', [PermissionController::class, 'destroy']);

                Route::post('employees',              [EmployeeController::class, 'store']);
                Route::put('employees/{employee}',    [EmployeeController::class, 'update']);
                Route::patch('employees/{employee}',  [EmployeeController::class, 'update']);
                Route::delete('employees/{employee}', [EmployeeController::class, 'destroy']);

                Route::post('employment-contracts',               [EmploymentContractController::class, 'store']);
                Route::put('employment-contracts/{contract}',     [EmploymentContractController::class, 'update']);
                Route::patch('employment-contracts/{contract}',   [EmploymentContractController::class, 'update']);
                Route::delete('employment-contracts/{contract}',  [EmploymentContractController::class, 'destroy']);

                Route::apiResource('opening-balance-stocks',  OpeningBalanceStockController::class);
                Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

                Route::apiResource('numbering-series', NumberingSeriesController::class);
                Route::post('numbering-series/{series}/lock',        [NumberingSeriesController::class, 'lock']);
                Route::post('numbering-series/{series}/unlock',      [NumberingSeriesController::class, 'unlock']);
                Route::get('numbering-series/{series}/next-number',  [NumberingSeriesController::class, 'getNextNumber']);
                Route::get('numbering-series/{series}/preview-next', [NumberingSeriesController::class, 'previewNextNumber']);
                Route::post('numbering-series/{series}/sync',        [NumberingSeriesController::class, 'syncNumber']);

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
                Route::apiResource('documents', CommercialDocumentController::class);
                Route::get('documents/unpaid',                    [CommercialDocumentController::class, 'unpaid']);
                Route::get('documents/overdue',                   [CommercialDocumentController::class, 'overdue']);
                Route::post('documents/{document}/validate',      [CommercialDocumentController::class, 'validateDocument']);
                Route::post('documents/{document}/lock',          [CommercialDocumentController::class, 'lock']);
                Route::post('documents/{document}/unlock',        [CommercialDocumentController::class, 'unlock']);
                Route::post('documents/{document}/cancel',        [CommercialDocumentController::class, 'cancel']);
                Route::get('documents/{document}/qrcode',         [CommercialDocumentController::class, 'generateQRCode']);

                Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

                Route::apiResource('payments', PaymentController::class);
                Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
                Route::get('payments/pending',   [PaymentController::class, 'pending']);

                Route::apiResource('checks', CheckController::class);
                Route::get('checks/pending',               [CheckController::class, 'pending']);
                Route::get('checks/overdue',               [CheckController::class, 'overdue']);
                Route::post('checks/{check}/mark-cleared', [CheckController::class, 'markAsCleared']);
                Route::post('checks/{check}/mark-bounced', [CheckController::class, 'markAsBounced']);

                Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
                Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
                Route::get('treasury-accounts/default',       [TreasuryAccountController::class, 'default']);
                Route::apiResource('treasury-accounts', TreasuryAccountController::class);

                Route::apiResource('expenses', ExpenseController::class);
                Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
                Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

                Route::post('product-lots',                [ProductLotController::class, 'store']);
                Route::put('product-lots/{lot}',           [ProductLotController::class, 'update']);
                Route::delete('product-lots/{lot}',        [ProductLotController::class, 'destroy']);

                Route::post('stock-movements',             [StockMovementController::class, 'store']);
                Route::delete('stock-movements/{movement}', [StockMovementController::class, 'destroy']);
            });

            // ── ⑤-د: فردية (المستخدم نفسه) ─────────────────────
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);

            Route::apiResource('settings', SettingController::class);
            Route::get('settings/group/{group}',    [SettingController::class, 'byGroup']);
            Route::get('settings/key/{key}/value',  [SettingController::class, 'getValue']);
        });
});
