<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PartyController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CommercialDocumentController;
use App\Http\Controllers\Api\V1\WarehouseController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\NumberingSeriesController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\EmploymentContractController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\OpeningBalanceStockController;
use App\Http\Controllers\Api\V1\OpeningBalancePartyController;
use App\Http\Controllers\Api\V1\ExchangeRateController;
use App\Http\Controllers\Api\V1\DocumentStatusController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\CheckController;
use App\Http\Controllers\Api\V1\PaymentModeController;
use App\Http\Controllers\Api\V1\TreasuryAccountController;
use App\Http\Controllers\Api\V1\QuantityDiscountController;
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
use App\Http\Controllers\Api\V1\CommercialDocumentLineController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ProductLotController;
use App\Http\Controllers\Api\V1\FiscalYearController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\StockMovementController;
use App\Http\Controllers\Api\V1\GenderController;
use App\Http\Controllers\Api\V1\InventoryValuationMethodController;
use App\Http\Controllers\Api\V1\TreasuryAccountTypeController;
use App\Http\Controllers\Api\V1\FiscalStampController;
use App\Http\Controllers\Api\V1\DocumentBaseOperationController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\CompanyController;

/*
|--------------------------------------------------------------------------
| API Routes (Laravel 11)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // ========== Auth Routes (بدون حماية) ==========
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // ========== Auth Routes (محمية) ==========
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/update', [AuthController::class, 'update']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // ========== Routes عامة للشركات (بدون company slug) ==========
    Route::middleware('auth:sanctum')->prefix('companies')->group(function () {
        Route::get('/', [CompanyController::class, 'index']);           // شركات المستخدم
        Route::post('/', [CompanyController::class, 'store']);          // إنشاء شركة جديدة
        Route::post('/switch', [CompanyController::class, 'switch']);   // تبديل الشركة النشطة
        Route::get('/current', [CompanyController::class, 'current']);  // الشركة النشطة حالياً
    });

    // ========== Lookup Tables (مشتركة بين الشركات – لا تحتاج company) ==========
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('currencies', CurrencyController::class);
        Route::apiResource('families', FamilyController::class);
        Route::apiResource('brands', BrandController::class);
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
        Route::get('permissions/by-group', [PermissionController::class, 'byGroup']);



        Route::apiResource('exchange-rates', ExchangeRateController::class);
        Route::get('exchange-rates/latest', [ExchangeRateController::class, 'latest']);
        Route::apiResource('document-statuses', DocumentStatusController::class);
        Route::apiResource('expense-categories', ExpenseCategoryController::class);
        Route::get('expense-categories/roots', [ExpenseCategoryController::class, 'roots']);
        Route::apiResource('payment-modes', PaymentModeController::class);
        Route::get('payment-modes/active', [PaymentModeController::class, 'active']);
        Route::apiResource('price-levels', PriceLevelController::class);
        Route::apiResource('legal-forms', LegalFormController::class);
        Route::apiResource('tvas', TvaController::class);
        Route::get('tvas/default', [TvaController::class, 'default']);
        Route::apiResource('units', UnitController::class);
        Route::apiResource('wilayas', WilayaController::class);
        Route::apiResource('communes', CommuneController::class);
        Route::apiResource('stock-movement-types', StockMovementTypeController::class);
        Route::apiResource('product-types', ProductTypeController::class);
        Route::apiResource('party-types', PartyTypeController::class);
        Route::apiResource('document-types', DocumentTypeController::class);
        Route::apiResource('genders', GenderController::class);
        Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class);
        Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class);
        Route::apiResource('fiscal-stamps', FiscalStampController::class);
        Route::apiResource('document-base-operations', DocumentBaseOperationController::class);
    });

    // ========== Tenant Resources (معزولة حسب الشركة) ==========
    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            // المرفقات (Attachments)
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{id}/download', [AttachmentController::class, 'download']);

            // الأطراف (عملاء / موردين)
            Route::apiResource('parties', PartyController::class);
            Route::get('customers', [PartyController::class, 'customers']);
            Route::get('suppliers', [PartyController::class, 'suppliers']);

            // المنتجات (ملاحظة: تم حذف withVariants)
            Route::apiResource('products', ProductController::class);
            Route::get('products/active', [ProductController::class, 'active']);
            Route::get('products/by-family/{familyId}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brandId}', [ProductController::class, 'byBrand']);

            // المستندات التجارية
            Route::apiResource('documents', CommercialDocumentController::class);
            Route::get('documents/unpaid', [CommercialDocumentController::class, 'unpaid']);
            Route::get('documents/overdue', [CommercialDocumentController::class, 'overdue']);
            Route::post('documents/{id}/validate', [CommercialDocumentController::class, 'validateDocument']);
            Route::post('documents/{id}/lock', [CommercialDocumentController::class, 'lock']);
            Route::post('documents/{id}/unlock', [CommercialDocumentController::class, 'unlock']);
            Route::post('documents/{id}/cancel', [CommercialDocumentController::class, 'cancel']);
            Route::get('documents/{id}/qrcode', [CommercialDocumentController::class, 'generateQRCode']);

            // المستودعات
            Route::apiResource('warehouses', WarehouseController::class);

            // سلاسل الترقيم
            Route::apiResource('numbering-series', NumberingSeriesController::class);
            Route::post('numbering-series/{id}/lock', [NumberingSeriesController::class, 'lock']);
            Route::post('numbering-series/{id}/unlock', [NumberingSeriesController::class, 'unlock']);
            Route::get('numbering-series/{id}/next-number', [NumberingSeriesController::class, 'getNextNumber']);
            Route::get('numbering-series/{id}/preview-next-number', [NumberingSeriesController::class, 'previewNextNumber']);
            Route::post('numbering-series/{id}/sync', [NumberingSeriesController::class, 'syncNumber']);

            // الأرصدة الافتتاحية
            Route::apiResource('opening-balance-stocks', OpeningBalanceStockController::class);
            Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

            // الشيكات
            Route::apiResource('checks', CheckController::class);
            Route::get('checks/pending', [CheckController::class, 'pending']);
            Route::get('checks/overdue', [CheckController::class, 'overdue']);
            Route::post('checks/{id}/mark-cleared', [CheckController::class, 'markAsCleared']);
            Route::post('checks/{id}/mark-bounced', [CheckController::class, 'markAsBounced']);

            // الحسابات الخزينة
            Route::apiResource('treasury-accounts', TreasuryAccountController::class);
            Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
            Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
            Route::get('treasury-accounts/default', [TreasuryAccountController::class, 'default']);

            // تخفيضات الكميات
            Route::apiResource('quantity-discounts', QuantityDiscountController::class);

            // أسطر المستندات
            Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

            // المصروفات
            Route::apiResource('expenses', ExpenseController::class);
            Route::get('expenses/paid', [ExpenseController::class, 'paid']);
            Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

            // دفعات المنتجات (Lots)
            Route::apiResource('product-lots', ProductLotController::class);
            Route::get('product-lots/available', [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring', [ProductLotController::class, 'expiring']);

            // السنوات المالية (لاحظ أن fiscal‑years لها company_id)
            Route::apiResource('fiscal-years', FiscalYearController::class);
            Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open', [FiscalYearController::class, 'open']);
            Route::post('fiscal-years/{id}/close', [FiscalYearController::class, 'close']);

            // الدفعات (payments)
            Route::apiResource('payments', PaymentController::class);
            Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
            Route::get('payments/pending', [PaymentController::class, 'pending']);

            // حركات المخزون
            Route::apiResource('stock-movements', StockMovementController::class);
            Route::get('stock-movements/incoming', [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing', [StockMovementController::class, 'outgoing']);

            // لوحة التحكم (خاصة بالشركة الحالية)
            Route::get('dashboard', [DashboardController::class, 'index']);
            Route::get('dashboard/sales-chart', [DashboardController::class, 'salesChart']);
            Route::get('dashboard/top-products', [DashboardController::class, 'topProducts']);
            Route::get('dashboard/top-customers', [DashboardController::class, 'topCustomers']);
            Route::get('dashboard/recent-transactions', [DashboardController::class, 'recentTransactions']);
            Route::get('dashboard/inventory', [DashboardController::class, 'inventory']);

            // التقارير (خاصة بالشركة)
            Route::get('reports/sales', [ReportController::class, 'sales']);
            Route::get('reports/purchases', [ReportController::class, 'purchases']);
            Route::get('reports/customers', [ReportController::class, 'customers']);
            Route::get('reports/suppliers', [ReportController::class, 'suppliers']);
            Route::get('reports/products', [ReportController::class, 'products']);
            Route::get('reports/inventory', [ReportController::class, 'inventory']);
            Route::get('reports/payments', [ReportController::class, 'payments']);
            Route::get('reports/taxes', [ReportController::class, 'taxes']);


            Route::apiResource('audits', AuditController::class);
            Route::get('audits/user/{userId}', [AuditController::class, 'byUser']);
            Route::get('audits/event/{event}', [AuditController::class, 'byEvent']);
            Route::apiResource('employees', EmployeeController::class);
            Route::get('employees/active', [EmployeeController::class, 'active']);
            Route::apiResource('employment-contracts', EmploymentContractController::class);
            Route::get('employment-contracts/employee/{employeeId}/active', [EmploymentContractController::class, 'active']);
            Route::apiResource('notifications', NotificationController::class);
            Route::get('notifications/unread', [NotificationController::class, 'unread']);
            Route::post('notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
            Route::post('notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
            Route::apiResource('settings', SettingController::class);
            Route::get('settings/group/{group}', [SettingController::class, 'byGroup']);
            Route::get('settings/key/{key}/value', [SettingController::class, 'getValue']);
        });
});
