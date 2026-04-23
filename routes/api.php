<?php

use Illuminate\Http\Request;
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
use App\Http\Controllers\Api\V1\ProductVariantPriceController;
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
use App\Http\Controllers\Api\V1\ProductVariantController;
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

Route::prefix('v1')->group(function () {
    // Auth Routes (without protection)
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Auth Routes (protected)
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/update', [AuthController::class, 'update']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        // Party Routes
        Route::apiResource('parties', PartyController::class);
        Route::get('customers', [PartyController::class, 'customers']);
        Route::get('suppliers', [PartyController::class, 'suppliers']);

        // Product Routes
        Route::apiResource('products', ProductController::class);
        Route::get('products/active', [ProductController::class, 'active']);
        Route::get('products/by-family/{familyId}', [ProductController::class, 'byFamily']);
        Route::get('products/by-brand/{brandId}', [ProductController::class, 'byBrand']);
        Route::get('products/with-variants', [ProductController::class, 'withVariants']);

        // Commercial Document Routes
        Route::apiResource('commercial-documents', CommercialDocumentController::class);
        Route::get('commercial-documents/unpaid', [CommercialDocumentController::class, 'unpaid']);
        Route::get('commercial-documents/overdue', [CommercialDocumentController::class, 'overdue']);
        Route::post('commercial-documents/{id}/validate', [CommercialDocumentController::class, 'validateDocument']);
        Route::post('commercial-documents/{id}/lock', [CommercialDocumentController::class, 'lock']);
        Route::post('commercial-documents/{id}/unlock', [CommercialDocumentController::class, 'unlock']);
        Route::post('commercial-documents/{id}/cancel', [CommercialDocumentController::class, 'cancel']);

        // Warehouse Routes
        Route::apiResource('warehouses', WarehouseController::class);

        // Currency Routes
        Route::apiResource('currencies', CurrencyController::class);

        // Family Routes
        Route::apiResource('families', FamilyController::class);

        // Brand Routes
        Route::apiResource('brands', BrandController::class);

        // Role & Permission Routes
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
        Route::get('permissions/by-group', [PermissionController::class, 'byGroup']);

        // Numbering Series Routes
        Route::apiResource('numbering-series', NumberingSeriesController::class);
        Route::get('numbering-series/{id}/next-number', [NumberingSeriesController::class, 'getNextNumber']);
        Route::post('numbering-series/{id}/lock', [NumberingSeriesController::class, 'lock']);
        Route::post('numbering-series/{id}/unlock', [NumberingSeriesController::class, 'unlock']);

        // Audit Routes
        Route::apiResource('audits', AuditController::class);
        Route::get('audits/user/{userId}', [AuditController::class, 'byUser']);
        Route::get('audits/event/{event}', [AuditController::class, 'byEvent']);

        // Attachment Routes
        Route::apiResource('attachments', AttachmentController::class);
        Route::get('attachments/{id}/download', [AttachmentController::class, 'download']);

        // Employee Routes
        Route::apiResource('employees', EmployeeController::class);
        Route::get('employees/active', [EmployeeController::class, 'active']);

        // Employment Contract Routes
        Route::apiResource('employment-contracts', EmploymentContractController::class);
        Route::get('employment-contracts/employee/{employeeId}/active', [EmploymentContractController::class, 'active']);

        // Notification Routes
        Route::apiResource('notifications', NotificationController::class);
        Route::get('notifications/unread', [NotificationController::class, 'unread']);
        Route::post('notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
        Route::post('notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);

        // Setting Routes
        Route::apiResource('settings', SettingController::class);
        Route::get('settings/group/{group}', [SettingController::class, 'byGroup']);
        Route::get('settings/key/{key}/value', [SettingController::class, 'getValue']);

        // Opening Balance Routes
        Route::apiResource('opening-balance-stocks', OpeningBalanceStockController::class);
        Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

        // Exchange Rate Routes
        Route::apiResource('exchange-rates', ExchangeRateController::class);
        Route::get('exchange-rates/latest', [ExchangeRateController::class, 'latest']);

        // Document Status Routes
        Route::apiResource('document-statuses', DocumentStatusController::class);

        // Expense Category Routes
        Route::apiResource('expense-categories', ExpenseCategoryController::class);
        Route::get('expense-categories/roots', [ExpenseCategoryController::class, 'roots']);

        // Check Routes
        Route::apiResource('checks', CheckController::class);
        Route::get('checks/pending', [CheckController::class, 'pending']);
        Route::get('checks/overdue', [CheckController::class, 'overdue']);
        Route::post('checks/{id}/mark-cleared', [CheckController::class, 'markAsCleared']);
        Route::post('checks/{id}/mark-bounced', [CheckController::class, 'markAsBounced']);

        // Payment Mode Routes
        Route::apiResource('payment-modes', PaymentModeController::class);
        Route::get('payment-modes/active', [PaymentModeController::class, 'active']);

        // Treasury Account Routes
        Route::apiResource('treasury-accounts', TreasuryAccountController::class);
        Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
        Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
        Route::get('treasury-accounts/default', [TreasuryAccountController::class, 'default']);

        // Quantity Discount Routes
        Route::apiResource('quantity-discounts', QuantityDiscountController::class);

        // Product Variant Price Routes
        Route::apiResource('product-variant-prices', ProductVariantPriceController::class);

        // Price Level Routes
        Route::apiResource('price-levels', PriceLevelController::class);

        // Legal Form Routes
        Route::apiResource('legal-forms', LegalFormController::class);

        // TVA Routes
        Route::apiResource('tvas', TvaController::class);
        Route::get('tvas/default', [TvaController::class, 'default']);

        // Unit Routes
        Route::apiResource('units', UnitController::class);

        // Wilaya Routes
        Route::apiResource('wilayas', WilayaController::class);

        // Commune Routes
        Route::apiResource('communes', CommuneController::class);

        // Stock Movement Type Routes
        Route::apiResource('stock-movement-types', StockMovementTypeController::class);

        // Product Type Routes
        Route::apiResource('product-types', ProductTypeController::class);

        // Party Type Routes
        Route::apiResource('party-types', PartyTypeController::class);

        // Document Type Routes
        Route::apiResource('document-types', DocumentTypeController::class);

        // Commercial Document Line Routes
        Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

        // Product Variant Routes
        Route::apiResource('product-variants', ProductVariantController::class);
        Route::get('product-variants/low-stock', [ProductVariantController::class, 'lowStock']);

        // Expense Routes
        Route::apiResource('expenses', ExpenseController::class);
        Route::get('expenses/paid', [ExpenseController::class, 'paid']);
        Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

        // Product Lot Routes
        Route::apiResource('product-lots', ProductLotController::class);
        Route::get('product-lots/available', [ProductLotController::class, 'available']);
        Route::get('product-lots/expiring', [ProductLotController::class, 'expiring']);

        // Fiscal Year Routes
        Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
        Route::get('fiscal-years/open',    [FiscalYearController::class, 'open']);
        Route::post('fiscal-years/{id}/close', [FiscalYearController::class, 'close']);

        Route::apiResource('fiscal-years', FiscalYearController::class);

        // Payment Routes
        Route::apiResource('payments', PaymentController::class);
        Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
        Route::get('payments/pending', [PaymentController::class, 'pending']);

        // Stock Movement Routes
        Route::apiResource('stock-movements', StockMovementController::class);
        Route::get('stock-movements/incoming', [StockMovementController::class, 'incoming']);
        Route::get('stock-movements/outgoing', [StockMovementController::class, 'outgoing']);

        // Gender Routes
        Route::apiResource('genders', GenderController::class);

        // Inventory Valuation Method Routes
        Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class);

        // Treasury Account Type Routes
        Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class);

        // Fiscal Stamp Routes
        Route::apiResource('fiscal-stamps', FiscalStampController::class);

        // Document Base Operation Routes
        Route::apiResource('document-base-operations', DocumentBaseOperationController::class);

        // Dashboard Routes
        Route::get('dashboard', [DashboardController::class, 'index']);
        Route::get('dashboard/sales-chart', [DashboardController::class, 'salesChart']);
        Route::get('dashboard/top-products', [DashboardController::class, 'topProducts']);
        Route::get('dashboard/top-customers', [DashboardController::class, 'topCustomers']);
        Route::get('dashboard/recent-transactions', [DashboardController::class, 'recentTransactions']);
        Route::get('dashboard/inventory', [DashboardController::class, 'inventory']);

        // Report Routes
        Route::get('reports/sales', [ReportController::class, 'sales']);
        Route::get('reports/purchases', [ReportController::class, 'purchases']);
        Route::get('reports/customers', [ReportController::class, 'customers']);
        Route::get('reports/suppliers', [ReportController::class, 'suppliers']);
        Route::get('reports/products', [ReportController::class, 'products']);
        Route::get('reports/inventory', [ReportController::class, 'inventory']);
        Route::get('reports/payments', [ReportController::class, 'payments']);
        Route::get('reports/taxes', [ReportController::class, 'taxes']);

        // QR Code Routes
        Route::get('commercial-documents/{id}/qrcode', [CommercialDocumentController::class, 'generateQRCode']);
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
