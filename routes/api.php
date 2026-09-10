<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TwoFactorAuthController;
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
use App\Http\Controllers\Api\V1\OpeningBalanceTreasuryController;
use App\Http\Controllers\Api\V1\CheckController;
use App\Http\Controllers\Api\V1\TreasuryAccountController;
use App\Http\Controllers\Api\V1\QuantityDiscountController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ProductLotController;
use App\Http\Controllers\Api\V1\FiscalYearController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\StockMovementController;
use App\Http\Controllers\Api\V1\DocumentComputeController;
use App\Http\Controllers\Api\V1\CustomerInsightController;
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
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\BankReconciliationController;
use App\Http\Controllers\Api\V1\ApprovalController;
use App\Http\Controllers\Api\V1\AlertController;
use App\Http\Controllers\Api\V1\DocumentMailController;
use App\Http\Controllers\Api\V1\PosSessionController;
use App\Http\Controllers\Api\V1\TaxConfigController;
use App\Http\Controllers\Api\V1\RegulatedProductsController;
use App\Http\Controllers\Api\V1\SubsidizedSalesController;
use App\Http\Controllers\Api\V1\G50DeclarationController;
use App\Http\Controllers\Api\V1\IFUDeclarationController;
use App\Http\Controllers\Api\V1\PrintTemplateController;
use App\Http\Controllers\Api\V1\EmailTemplateController;
use App\Http\Controllers\Api\V1\PdfExportController;
use App\Http\Controllers\Api\V1\DocumentLineTemplateController;
use App\Http\Controllers\Api\V1\Portal\PortalAuthController;
use App\Http\Controllers\Api\V1\Portal\PortalController;
use App\Http\Controllers\Api\V1\Portal\PortalAccessController;
use App\Http\Controllers\Api\V1\HealthController;


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
use App\Http\Controllers\Api\V1\PartyBalanceController;
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
        // 🔐 الخطوة الثانية من تسجيل الدخول عند تفعيل 2FA (بدون توكن بعد)
        Route::post('/two-factor/confirm', [TwoFactorAuthController::class, 'confirm'])
            ->middleware('throttle:5,15');

        Route::middleware(['auth:sanctum', '2fa.verified'])->group(function () {
            Route::get('/me',               [AuthController::class, 'me']);
            Route::put('/update',           [AuthController::class, 'update']);
            // 🔒 تغيير كلمة المرور — 3 محاولات / ساعة
            Route::post('/change-password', [AuthController::class, 'changePassword'])
                ->middleware('throttle:3,60');
            Route::post('/logout',          [AuthController::class, 'logout']);

            // 🔐 المصادقة الثنائية (2FA) — عمليات الإعداد والإدارة
            Route::prefix('two-factor')->group(function () {
                Route::get('/setup',            [TwoFactorAuthController::class, 'setup']);
                Route::post('/enable',          [TwoFactorAuthController::class, 'enable']);
                Route::post('/disable',         [TwoFactorAuthController::class, 'disable']);
                Route::post('/recovery-codes',  [TwoFactorAuthController::class, 'recoveryCodes']);
            });

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
    // ①-a IMAGE PROXY — خدمة صور بدون مصادقة (تُستعمل في وسم <img> مباشرة)
    // ═══════════════════════════════════════════
    // بدون auth:sanctum: المتصفح لا يرسل Authorization header مع <img>.
    // يقيّد بأسماء نطاقات خارجية معروفة فقط (انظر ImageProxyController).
    Route::get('/image-proxy', [\App\Http\Controllers\Api\V1\ImageProxyController::class, 'proxy'])
        ->middleware('throttle:120,60');

    // ═══════════════════════════════════════════
    // ①-c HEALTH — فحص اتصال النظام (بدون مصادقة)
    // ═══════════════════════════════════════════
    // يُستعمل من صفحة حالة الاتصال (/status) قبل تسجيل الدخول لمعرفة
    // هل الخادم و قاعدة البيانات متصلتان وما هي تفاصيل البيئة.
    Route::get('/health', [HealthController::class, 'check']);

    // ═══════════════════════════════════════════
    // ①-d SHARE — عرض وثيقة عامة بالتوكن (بدون مصادقة)
    // ═══════════════════════════════════════════
    // رابط مشاركة صالح لمدة 7 أيام يُولّد عبر POST /documents/{id}/share.
    // يعرض بيانات الوثيقة (رقم، تاريخ، أطراف، أسطر، إجماليات) للعميل
    // بدون تسجيل دخول — مخصص لإرساله عبر واتساب.
    Route::get('/share/{token}', \App\Http\Controllers\Api\V1\PublicDocumentShareController::class);

    // ═══════════════════════════════════════════
    // ①-b CUSTOMER PORTAL (بوابة الزبائن) — لكل مؤسسة
    // ═══════════════════════════════════════════
    // مسارات لكل مؤسسة على حدة: /api/v1/{company}/portal/*
    //   - portal.company: يحل {company} slug ويضبط سياق الشركة (لا يتطلب عضوية)
    //   - portal.auth:    يتحقق من توكن زبون البوابة (PortalUser)
    // تسجيل الدخول و /info (معلومات المؤسسة لصفحة الدخول) بدون مصادقة.
    // بدون SubstituteBindings: الـ binding العام لـ {company} يحل بالـ slug فقط
    // (AppServiceProvider::boot Route::bind) — البوابة تقبل portal_slug أو slug،
    // لذا الحل يتم داخل SetPortalCompanyContext (portal.company).
    Route::prefix('{company}/portal')
        ->middleware('portal.company')
        ->withoutMiddleware(\Illuminate\Routing\Middleware\SubstituteBindings::class)
        ->group(function () {
        Route::post('/auth/login', [PortalAuthController::class, 'login'])
            ->middleware('throttle:5,15');

        Route::get('/info', [PortalController::class, 'companyInfo']);

        // إعدادات البوابة العامة (بدون مصادقة): حالة التفعيل + حدود الطلب +
        // رسالة التأكيد — تعكس أذونات حامل التوكن (أو الزائر) عبر
        // optionalPortalUser، تُستهلك لتوجيه واجهة المتجر قبل أي طلب.
        Route::get('/config', [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'config']);

        // ── طلبات السلع: نقطة البيع العامة (بدون حساب بوابة) ──
        // الكتالوج + الإنشاء يخدمان الزبون المعتمد والزائر معاً:
        //   - معتمد (Bearer portal token): كتالوجه بحالته الجبائية + مستوى
        //     سعره الشخصي، ويُربط الطلب بزبونه (السلوك الأصلي).
        //   - زائر: كتالوج المؤسسة الافتراضي، والطلب يرسل customer_name/
        //     customer_phone ويُربط بزبون الصندوق (Client Cash).
        // لذلك هذان المساران خارج portal.auth (يُحل الزبون داخل المتحكم عبر
        // optionalPortalUser) — أما بقية مسارات الطلبات الخاصة بالزبون فتبقى
        // خلف المصادقة. `throttle` يمنع إغراق إنشاء الطلبات من الزوار.
        Route::get('/orders/catalog', [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'catalog']);
        Route::post('/orders', [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'store'])
            ->middleware('throttle:60,1');
        // تتبع طلب الزائر برقم هاتفه — بدون حساب، يُرجع طلباته العامة فقط.
        // حد مرتفع نسبياً: الزائر القادم من صفحة الطلب يبحث تلقائياً عند فتح
        // الصفحة وقد يعيد فتحها/البحث عدة مرات أثناء انتظار معالجة طلبه —
        // المسار للقراءة فقط (يُرجع 20 طلباً عاماً على الأكثر بمطابقة رقم
        // الهاتف) فسقف 30/دقيقة يكفي ولا يفتح باب إغراق.
        Route::post('/orders/track', [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'track'])
            ->middleware('throttle:30,1');

        // ── إشعار مزوّد الدفع الإلكتروني (webhook) — يعتمد على التوقيع فقط ──
        // خارج portal.auth: البوابة (أو نموذج الدفع المحلي) تتصل مباشرة بهذا
        // المسار، لا حامل توكن زبون البوابة. ضمن سياق المؤسسة (portal.company)
        // حتى يُحل المزوّد حسب إعدادات المؤسسة (online_payment_provider).
        // التحقق: توقيع HMAC → مبلغ من الخادم (يطابق النية) → نافذة زمنية →
        // تطبيق idempotent (حماية إعادة اللعب) داخل settlePayment.
        Route::post('/payment/webhook', \App\Http\Controllers\Api\V1\Portal\PortalPaymentWebhookController::class)
            ->name('portal.payment.webhook');

        Route::middleware('portal.auth')->group(function () {
            Route::get('/auth/me',      [PortalAuthController::class, 'me']);
            Route::post('/auth/logout', [PortalAuthController::class, 'logout']);

            Route::get('/dashboard',    [PortalController::class, 'dashboard']);
            Route::get('/documents',    [PortalController::class, 'documents']);
            Route::get('/documents/{id}', [PortalController::class, 'showDocument']);
            Route::get('/payments',     [PortalController::class, 'payments']);
            Route::get('/statement',    [PortalController::class, 'statement']);

            Route::get('/profile',          [PortalController::class, 'profile']);
            Route::put('/profile',          [PortalController::class, 'updateProfile']);
            Route::put('/profile/password', [PortalController::class, 'updatePassword']);

            // ── طلبات السلع (وصل طلب سلعة) — طلبات الزبون الخاصة فقط ──
            Route::get('/orders',             [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'index']);
            Route::get('/orders/{id}',        [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'showOrder']);
            Route::put('/orders/{id}',        [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'update']);
            Route::patch('/orders/{id}',      [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'update']);
            Route::post('/orders/{id}/validate', [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'validateOrder']);
            Route::post('/orders/{id}/cancel',   [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'cancel']);
            Route::post('/orders/{id}/pay',      [\App\Http\Controllers\Api\V1\Portal\PortalOrderController::class, 'pay']);
        });
    });

    // ═══════════════════════════════════════════
    // ② USER COMPANIES
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', '2fa.verified'])->prefix('companies')->group(function () {
        Route::get('/current', [CompanyController::class, 'current']);
        Route::post('/switch', [CompanyController::class, 'switch']);
        Route::post('/{company}/avatar', [CompanyController::class, 'uploadAvatar']);
        Route::get('/{company}/portal-qr', [CompanyController::class, 'portalQr']);

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

        Route::get('/users/search', [CompanyController::class, 'searchUsers']);
    });

    // ═══════════════════════════════════════════
    // ③ SUPER ADMIN (api_admin.php)
    // ═══════════════════════════════════════════

    // ═══════════════════════════════════════════
    // ④ GLOBAL LOOKUPS (only wilayas, communes)
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', '2fa.verified'])->group(function () {
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);
    });

    // ═══════════════════════════════════════════
    // ⑤ TENANT RESOURCES
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', '2fa.verified', 'company'])
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
            Route::get('dashboard/top-debtors',          [DashboardController::class, 'topDebtors']);
            Route::get('dashboard/top-profitable',        [DashboardController::class, 'topProfitable']);

            Route::prefix('reports')->group(function () {
                // ── تقارير متاحة لكل أعضاء الشركة (الحماية التفصيلية في الواجهة — Phase 3) ──
                Route::get('sales',           [ReportController::class, 'sales']);
                Route::get('purchases',       [ReportController::class, 'purchases']);
                Route::get('customers',       [ReportController::class, 'customers']);
                Route::get('suppliers',       [ReportController::class, 'suppliers']);
                Route::get('returns',         [ReportController::class, 'returns']);
                Route::get('sales-trend',     [ReportController::class, 'salesTrend']);
                Route::get('sales-matrix',    [ReportController::class, 'salesMatrix']);
                Route::get('purchases-matrix',[ReportController::class, 'purchasesMatrix']);
                Route::get('matrix-detail',   [ReportController::class, 'matrixDetail']);

                // ── تقارير المخزون — can:view_inventory_report ──
                Route::middleware('can:view_inventory_report')->group(function () {
                    Route::get('inventory',         [ReportController::class, 'inventory']);
                    Route::get('stock-movements',   [ReportController::class, 'stockMovements']);
                    Route::get('product-movement',  [ReportController::class, 'productMovement']);
                    Route::get('product-history',   [ReportController::class, 'productHistory']);
                    Route::get('products',          [ReportController::class, 'products']);
                    Route::get('velocity',          [ReportController::class, 'velocity']);
                });

                // ── تقارير مالية حساسة — can:view_financial_report ──
                Route::middleware('can:view_financial_report')->group(function () {
                    Route::get('payments',       [ReportController::class, 'payments']);
                    Route::get('taxes',          [ReportController::class, 'taxes']);
                    Route::get('cash-flow',      [ReportController::class, 'cashFlow']);
                    Route::get('expenses',       [ReportController::class, 'expenses']);
                    Route::get('profit-loss',    [ReportController::class, 'profitLoss']);
                    Route::get('margin',         [ReportController::class, 'margin']);
                    Route::get('forecast',       [ReportController::class, 'forecast']);
                    Route::get('monthly',        [ReportController::class, 'monthly']);
                    Route::get('daily',          [ReportController::class, 'daily']);
                    Route::get('aging',          [ReportController::class, 'aging']);
                    Route::get('creative',       [ReportController::class, 'creative']);
                    Route::get('grand-livre',    [ReportController::class, 'grandLivre']);
                    Route::get('client-monthly', [ReportController::class, 'clientMonthly']);
                    Route::get('dashboard',      [ReportController::class, 'dashboard']);
                });
            });

            // جداول مرجعية — endpoint مجمّع للمنتجات ( families + brands + units + tvas + ... )
            Route::get('lookups/products', [\App\Http\Controllers\Api\V1\ProductLookupsController::class, 'index']);

            // جداول مرجعية — endpoint مجمّع لبيانات POS (1 요청 → 9 جداول مرجعية)
            Route::get('lookups/pos', [\App\Http\Controllers\Api\V1\PosLookupsController::class, 'index']);

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
            Route::get('document-type-conversions',                             [\App\Http\Controllers\Api\V1\DocumentTypeConversionController::class, 'index']);
            Route::get('document-type-conversions/document-types',              [\App\Http\Controllers\Api\V1\DocumentTypeConversionController::class, 'documentTypes']);
            Route::get('document-type-conversions/{sourceCode}/allowed-targets', [\App\Http\Controllers\Api\V1\DocumentTypeConversionController::class, 'allowedTargets']);
            Route::post('document-type-conversions/bulk-update',                [\App\Http\Controllers\Api\V1\DocumentTypeConversionController::class, 'bulkUpdate']);
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
            Route::get('products/image-search',       [ProductController::class, 'imageSearch']);
            Route::get('products/by-family/{family}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',   [ProductController::class, 'byBrand']);
            Route::post('products/generate-barcode',  [ProductController::class, 'generateBarcode']);
            Route::get('products/{product}',          [ProductController::class, 'show']);
            Route::post('products/{product}/image',   [ProductController::class, 'uploadImage']);
            Route::delete('products/{product}/image', [ProductController::class, 'deleteImage']);

            Route::get('product-variants',                  [ProductVariantController::class, 'index']);
            Route::get('product-variants/barcode-search',  [ProductVariantController::class, 'barcodeSearch']);
            Route::get('product-variants/{variant}',       [ProductVariantController::class, 'show']);
            Route::get('products/{product}/variants',      [ProductVariantController::class, 'indexByProduct']);

            Route::get('products/{product}/barcodes',  [BarcodeController::class, 'indexByProduct']);
            Route::get('barcodes',                     [BarcodeController::class, 'index']);
            Route::get('barcodes/{barcode}',           [BarcodeController::class, 'show']);
            Route::post('barcodes',                    [BarcodeController::class, 'store']);
            Route::put('barcodes/{barcode}',           [BarcodeController::class, 'update']);
            Route::delete('barcodes/{barcode}',        [BarcodeController::class, 'destroy']);

            Route::get('warehouses',             [WarehouseController::class, 'index']);
            Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show']);

            Route::get('parties',         [PartyController::class, 'index']);
            Route::get('parties/{party}', [PartyController::class, 'show']);
            Route::get('cash-client',     [PartyController::class, 'cashClient']);
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

            // ✅ inventory: المسارات المحددة قبل المورد
            Route::get('inventory/stock-at', [InventoryController::class, 'stockAt']);

            // ✅ fiscal-years: المسارات المحددة قبل المورد
            Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',    [FiscalYearController::class, 'open']);
            Route::get('fiscal-years',         [FiscalYearController::class, 'index']);
            Route::get('fiscal-years/{year}',  [FiscalYearController::class, 'show']);

            // قراءة الأدوار/الصلاحيات — can:view_roles (المالك/المدير/المشاهد فقط،
            // وليس أمين الصندوق). الكاتبة في مجموعة can:manage_roles أدناه.
            Route::middleware('can:view_roles')->group(function () {
                Route::get('roles',                    [RoleController::class, 'index']);
                Route::get('roles/{role}',             [RoleController::class, 'show']);
                Route::get('permissions/by-group',     [PermissionController::class, 'byGroup']);
                Route::get('permissions',              [PermissionController::class, 'index']);
                Route::get('permissions/{permission}', [PermissionController::class, 'show']);
            });

            // ✅ notifications (routes/notifications.php)
            require __DIR__ . '/notifications.php';

            // ✅ سجل التدقيق — can:view_audit_log (المالك/المسؤول فقط)
            Route::middleware('can:view_audit_log')->group(function () {
                // المسارات المحددة (user/{user}, event/{event}) قبل {audit} لتجنب التقاطها كمعرّف
                Route::get('audits',               [AuditController::class, 'index']);
                Route::get('audits/user/{user}',   [AuditController::class, 'byUser']);
                Route::get('audits/event/{event}', [AuditController::class, 'byEvent']);
                Route::get('audits/{audit}',       [AuditController::class, 'show']);
            });

            Route::prefix('me')->group(function () {
                Route::get('/',                 [UserController::class, 'profile']);
                Route::put('/',                 [UserController::class, 'updateProfile']);
                Route::post('/avatar',          [UserController::class, 'updateAvatar']);
                Route::post('/change-password', [AuthController::class, 'changePassword']);
                Route::get('permissions',       [UserController::class, 'myPermissions']);
                Route::get('roles',             [UserController::class, 'myRoles']);
            });

            // ── مستخدمون (قراءة) — للمدير/المالك فقط (can:view_any_user) ──
            Route::middleware('can:view_any_user')->group(function () {
                // ✅ المسارات المحددة قبل apiResource لتجنب conflict
                Route::get('users/trashed',   [UserController::class, 'trashed']);
                Route::get('users/active',    [UserController::class, 'active']);
                Route::get('users/inactive',  [UserController::class, 'inactive']);
                Route::get('users-by-role',   [UserController::class, 'byRole']);
                Route::apiResource('users', UserController::class)->only(['index', 'show']);
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
                Route::post('products/copy-config',    [ProductController::class, 'copyConfig']);
                Route::apiResource('products',          ProductController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('product-variants',  ProductVariantController::class,      ['except' => ['index', 'show']]);
                Route::apiResource('warehouses',        WarehouseController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('parties',           PartyController::class,               ['except' => ['index', 'show']]);

                // مستخدمون (كتابة — can:update_company)
                // ✅ القراءة في مجموعة can:view_any_user أعلاه
                // ✅ الحذف / التفعيل / تعيين الدور → مجموعة can:manage_company_members أدناه
                // ✅ أدوار/صلاحيات (كتابة) → مجموعة can:manage_roles أدناه
                Route::post('users',                        [UserController::class, 'store']);
                Route::put('users/{user}',                  [UserController::class, 'update']);
                Route::patch('users/{user}',                [UserController::class, 'update']);
                Route::post('users/{user}/restore',        [UserController::class, 'restore']);
                Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
                Route::post('users/{user}/change-password', [UserController::class, 'changePassword']);

                // موظفون وعقود
                Route::apiResource('employees',             EmployeeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('employment-contracts',  EmploymentContractController::class, ['except' => ['index', 'show']]);

                // أرصدة افتتاحية
                Route::apiResource('opening-balance-stocks',    OpeningBalanceStockController::class);
                Route::apiResource('opening-balance-parties',   OpeningBalancePartyController::class);
                Route::apiResource('opening-balance-treasury',  OpeningBalanceTreasuryController::class);

                // سلاسل الترقيم
                Route::apiResource('numbering-series', NumberingSeriesController::class);
                Route::post('numbering-series/{series}/lock',        [NumberingSeriesController::class, 'lock']);
                Route::post('numbering-series/{series}/unlock',      [NumberingSeriesController::class, 'unlock']);
                Route::get('numbering-series/{series}/next-number',  [NumberingSeriesController::class, 'getNextNumber']);
                Route::get('numbering-series/{series}/preview-next', [NumberingSeriesController::class, 'previewNextNumber']);
                Route::post('numbering-series/{series}/sync',        [NumberingSeriesController::class, 'syncNumber']);

                // تخفيضات الكميات
                Route::apiResource('quantity-discounts', QuantityDiscountController::class);

                // استيراد (import) للمنتجات والأطراف
                Route::prefix('import')->group(function () {
                    Route::post('products/preview', [\App\Http\Controllers\Api\V1\ImportController::class, 'previewProducts']);
                    Route::post('products/execute', [\App\Http\Controllers\Api\V1\ImportController::class, 'executeProducts']);
                    Route::post('parties/preview',  [\App\Http\Controllers\Api\V1\ImportController::class, 'previewParties']);
                    Route::post('parties/execute',  [\App\Http\Controllers\Api\V1\ImportController::class, 'executeParties']);
                });
            });

            // ── ⑤-ب-١: إدارة أعضاء الشركة (can:manage_company_members) ──
            Route::middleware('can:manage_company_members')->group(function () {
                Route::delete('users/{user}',              [UserController::class, 'destroy']);
                Route::post('users/{user}/toggle-active',  [UserController::class, 'toggleActive']);
                Route::post('users/{user}/assign-role',    [UserController::class, 'assignRole']);
            });

            // ── ⑤-ب-١-م: إدارة الأدوار والصلاحيات (can:manage_roles) ──
            Route::middleware('can:manage_roles')->group(function () {
                Route::apiResource('roles',       RoleController::class,        ['except' => ['index', 'show']]);
                Route::apiResource('permissions', PermissionController::class,  ['except' => ['index', 'show']]);
            });

            // ── ⑤-ب-٢: السنوات المالية (manage_fiscal_year) ─────
            Route::middleware('can:manage_fiscal_year')->group(function () {
                Route::post('fiscal-years',                       [FiscalYearController::class, 'store']);
                Route::put('fiscal-years/{year}',                 [FiscalYearController::class, 'update']);
                Route::patch('fiscal-years/{year}',               [FiscalYearController::class, 'update']);
                Route::delete('fiscal-years/{year}',              [FiscalYearController::class, 'destroy']);
                Route::post('fiscal-years/{year}/close',          [FiscalYearController::class, 'close']);
                Route::post('fiscal-years/{year}/import-from/{sourceYear}', [FiscalYearController::class, 'importBalances']);
                Route::post('fiscal-years/{year}/transfer-to/{targetYear}', [FiscalYearController::class, 'transferBalances']);
                Route::get('fiscal-years/{year}/related-data',    [FiscalYearController::class, 'relatedData']);
            });

            // ── ⑤-ج: للمالك والمدير والمحاسب ──────────────────
            Route::middleware('can:create_sales_document')->group(function () {

                // ✅ المسارات المحددة (unpaid, overdue, compute-line) يجب أن تكون
                //    قبل apiResource — وإلا Laravel يعترضها كـ {commercialDocument}
                Route::get('documents/unpaid',       [CommercialDocumentController::class, 'unpaid']);
                Route::get('documents/overdue',      [CommercialDocumentController::class, 'overdue']);
                Route::get('documents/check-number', [CommercialDocumentController::class, 'checkNumber']);
                Route::get('documents/next-number',  [CommercialDocumentController::class, 'nextNumber']);
                Route::get('documents/last-for-party', [CommercialDocumentController::class, 'lastForParty']);
                Route::post('documents/{commercialDocument}/share', [CommercialDocumentController::class, 'share']);
                Route::post('documents/{commercialDocument}/clone', [CommercialDocumentController::class, 'cloneDocument']);
                Route::post('documents/compute-line',   [DocumentComputeController::class, 'computeLine']);
                Route::post('documents/compute-totals', [DocumentComputeController::class, 'computeTotals']);

                // ✅ apiResource بعد المسارات المحددة
                Route::apiResource('documents', CommercialDocumentController::class);

                // مسارات الإجراءات على الوثيقة
                Route::post('documents/{commercialDocument}/validate', [CommercialDocumentController::class, 'validateDocument']);
                Route::post('documents/{commercialDocument}/lock',     [CommercialDocumentController::class, 'lock']);
                Route::post('documents/{commercialDocument}/unlock',   [CommercialDocumentController::class, 'unlock']);
                Route::post('documents/{commercialDocument}/cancel',   [CommercialDocumentController::class, 'cancel']);
                Route::post('documents/{commercialDocument}/payments', [CommercialDocumentController::class, 'addPayments']);
                Route::get('documents/{commercialDocument}/qrcode',    [CommercialDocumentController::class, 'generateQRCode']);
                Route::get('documents/{commercialDocument}/audit-log', [CommercialDocumentController::class, 'auditLog']);

                // ── مسارات التحويل والمرتجع ─────────────
                Route::post('documents/{document}/convert', [DocumentComputeController::class, 'convert']);
                Route::get ('documents/{document}/chain',   [DocumentComputeController::class, 'chain']);
                Route::post('documents/{document}/return',  [DocumentComputeController::class, 'createReturn']);

                // ── فحص الائتمان ─────────────────────────────────
                Route::get('parties/{party}/credit-check', [DocumentComputeController::class, 'creditCheck']);

                // ── تحليلات المتعامل ───────────────────────────────
                Route::get('parties/{party}/insights',            [CustomerInsightController::class, 'insights']);
                Route::get('parties/{party}/product-suggestions', [CustomerInsightController::class, 'productSuggestions']);
                Route::get('parties/{party}/advances',          [CustomerInsightController::class, 'advances']);

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
                Route::get('party-balances', [PartyBalanceController::class, 'index']);

                Route::get('party-balances/{partyId}/history', [PartyBalanceController::class, 'history']);

                Route::get('party-balances/{partyId}/product-recap', [PartyBalanceController::class, 'productRecap']);

                Route::get('party-balances/{partyId}/detailed-history', [PartyBalanceController::class, 'detailedHistory']);

                Route::get('party-balances/{partyId}', [PartyBalanceController::class, 'show']);
                // ✅ expenses: المسارات المحددة قبل apiResource
                Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
                Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);
                Route::apiResource('expenses', ExpenseController::class);

                Route::post('product-lots',         [ProductLotController::class, 'store']);
                Route::put('product-lots/{lot}',    [ProductLotController::class, 'update']);
                Route::delete('product-lots/{lot}', [ProductLotController::class, 'destroy']);

                Route::post('stock-movements',              [StockMovementController::class, 'store']);
                Route::delete('stock-movements/{movement}', [StockMovementController::class, 'destroy']);

                // ── المطابقة البنكية ────────────────────────────────
                Route::get('reconciliation/unreconciled',    [BankReconciliationController::class, 'unreconciled']);
                Route::get('reconciliation/reconciled',      [BankReconciliationController::class, 'reconciled']);
                Route::post('reconciliation/reconcile',      [BankReconciliationController::class, 'reconcile']);
                Route::post('reconciliation/bulk-reconcile', [BankReconciliationController::class, 'bulkReconcile']);
                Route::post('reconciliation/suggest-matches',[BankReconciliationController::class, 'suggestMatches']);
                Route::post('reconciliation/{paymentId}/unreconcile', [BankReconciliationController::class, 'unreconcile']);

                // ── نظام الموافقات ──────────────────────────────────
                Route::get('approvals/check/{documentId}',  [ApprovalController::class, 'check']);
                Route::post('approvals/check-batch',        [ApprovalController::class, 'checkBatch']);
                Route::post('approvals/submit/{documentId}',[ApprovalController::class, 'submit']);
                Route::post('approvals/{documentId}/approve',[ApprovalController::class, 'approve']);
                Route::post('approvals/{documentId}/reject', [ApprovalController::class, 'reject']);
                Route::get('approvals/thresholds',          [ApprovalController::class, 'thresholds']);
                Route::post('approvals/thresholds',         [ApprovalController::class, 'storeThreshold']);

                // ── تنبيهات ذكية ────────────────────────────────────
                Route::get('alerts/unread',      [AlertController::class, 'unread']);
                Route::get('alerts/all',         [AlertController::class, 'all']);
                Route::get('alerts/count',       [AlertController::class, 'count']);
                Route::post('alerts/{alertId}/read', [AlertController::class, 'markAsRead']);
                Route::post('alerts/mark-all-read',  [AlertController::class, 'markAllAsRead']);
                Route::post('alerts/run-daily',       [AlertController::class, 'runDaily']);

                // ── إرسال المستند للزبون ────────────────────────────
                Route::post('documents/{documentId}/send-mail', [DocumentMailController::class, 'send']);
            });

            // ── Fiscal / Tax Management ──────────────────────────
            Route::get('tax-config/{regime}',               [TaxConfigController::class, 'show']);
            Route::get('tax-config/{regime}/history',       [TaxConfigController::class, 'history']);

            Route::get('regulated-products',                [RegulatedProductsController::class, 'index']);

            Route::get('subsidized-sales/summary',          [SubsidizedSalesController::class, 'summary']);
            Route::get('subsidized-sales/violations',       [SubsidizedSalesController::class, 'violations']);

            Route::get('g50-declaration',                   [G50DeclarationController::class, 'show']);
            Route::get('g50-declaration/history',           [G50DeclarationController::class, 'history']);

            Route::get('ifu-declaration',                   [IFUDeclarationController::class, 'show']);
            Route::get('ifu-declaration/history',           [IFUDeclarationController::class, 'history']);

            // ── Write routes (can:update_company) ──────────────
            Route::middleware('can:update_company')->group(function () {
                Route::put('tax-config/{regime}',                  [TaxConfigController::class, 'update']);
                Route::post('regulated-products',                   [RegulatedProductsController::class, 'store']);
                Route::put('regulated-products/{id}',               [RegulatedProductsController::class, 'update']);
                Route::patch('regulated-products/{id}/toggle',      [RegulatedProductsController::class, 'toggle']);
                Route::delete('regulated-products/{id}',            [RegulatedProductsController::class, 'destroy']);
                Route::post('regulated-products/seed-defaults',     [RegulatedProductsController::class, 'seedDefaults']);

                Route::post('subsidized-sales/compute',             [SubsidizedSalesController::class, 'compute']);
                Route::put('subsidized-sales/{id}',                  [SubsidizedSalesController::class, 'update']);
                Route::patch('subsidized-sales/{id}',                [SubsidizedSalesController::class, 'update']);
                Route::delete('subsidized-sales/{id}',               [SubsidizedSalesController::class, 'destroy']);

                Route::post('g50-declaration/save-period',          [G50DeclarationController::class, 'savePeriod']);
                Route::post('ifu-declaration/save-period',          [IFUDeclarationController::class, 'savePeriod']);

                // ── حساب البوابة للزبائن (إدارة وصول الزبون) ─────────
                Route::post('portal-access',                    [PortalAccessController::class, 'createPortal']);
                Route::get('portal-access/for-party/{partyId}', [PortalAccessController::class, 'forParty']);
                Route::put('portal-access/{id}',                [PortalAccessController::class, 'update']);
                Route::delete('portal-access/{id}',             [PortalAccessController::class, 'destroy']);
            });

            // ── النسخ الاحتياطي واستعادة قاعدة البيانات — can:manage_backup (sibling, key-only) ──
            Route::middleware('can:manage_backup')->group(function () {
                Route::prefix('backups')->group(function () {
                    Route::post('import',    [\App\Http\Controllers\Api\V1\BackupController::class, 'import']);
                    Route::get('/',        [\App\Http\Controllers\Api\V1\BackupController::class, 'index']);
                    Route::post('/',       [\App\Http\Controllers\Api\V1\BackupController::class, 'store']);
                    Route::post('{file}/verify',    [\App\Http\Controllers\Api\V1\BackupController::class, 'verify']);
                    Route::get('{file}/download',   [\App\Http\Controllers\Api\V1\BackupController::class, 'download']);
                    Route::post('{file}/restore',   [\App\Http\Controllers\Api\V1\BackupController::class, 'doRestore']);
                    Route::delete('{file}',         [\App\Http\Controllers\Api\V1\BackupController::class, 'destroy']);
                });
            });

            // ── طابعات النظام (اكتشاف طابعات ويندوز المثبتة) — can:manage_printer (sibling, key-only) ──
            Route::middleware('can:manage_printer')->group(function () {
                Route::get('system/printers',       [\App\Http\Controllers\Api\V1\SystemPrinterController::class, 'index']);
                Route::post('system/printers/test', [\App\Http\Controllers\Api\V1\SystemPrinterController::class, 'testPrint']);
                Route::post('system/printers/raw',  [\App\Http\Controllers\Api\V1\SystemPrinterController::class, 'rawPrint']);
                Route::post('system/printers/raw-text', [\App\Http\Controllers\Api\V1\SystemPrinterController::class, 'rawText']);
                Route::post('system/printers/html', [\App\Http\Controllers\Api\V1\SystemPrinterController::class, 'htmlPrint']);
            });

            // ── طلبات بوابة الزبائن (إدارة المسؤول) — can:manage_portal_orders ──
            Route::middleware('can:manage_portal_orders')->group(function () {
                Route::get('portal-orders/summary',   [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'summary']);
                Route::get('portal-orders',           [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'index']);
                Route::get('portal-orders/{id}',          [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'show']);
                Route::patch('portal-orders/{id}',        [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'update']);
                Route::patch('portal-orders/{id}/lines',  [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'updateLines']);
                Route::post('portal-orders/{id}/convert', [\App\Http\Controllers\Api\V1\Portal\PortalOrdersController::class, 'convert']);
            });

            // ── POS Sessions ──────────────────────────────────────
            Route::prefix('pos-sessions')->group(function () {
                Route::get('device-name',            [PosSessionController::class, 'deviceName']);
                Route::get('current',                [PosSessionController::class, 'current']);
                Route::post('/',                     [PosSessionController::class, 'open']);
                Route::post('{session}/increment',   [PosSessionController::class, 'increment']);
                Route::post('{session}/heartbeat',   [PosSessionController::class, 'heartbeat']);
                Route::post('{session}/close',       [PosSessionController::class, 'close']);
                Route::get('/',                      [PosSessionController::class, 'index']);
                Route::get('{session}',              [PosSessionController::class, 'show']);
            });

            // ── ⑤-د: فردية (المستخدم نفسه) ─────────────────────
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);
            Route::get('attachments/{attachment}/view',     [AttachmentController::class, 'view']);

            // ✅ settings: المسارات المحددة قبل apiResource
            // ① المسارات المحددة أولاً (قبل أي {wildcard}) — قراءة فردية لكل أعضاء الشركة
            Route::get('settings/group/{group}',   [SettingController::class, 'byGroup']);
            Route::get('settings/{key}',           [SettingController::class, 'getValue']);

            // ② العمليات الجماعية على /settings (بدون ID)
            Route::middleware('can:view_settings')->group(function () {
                Route::get('settings',                 [SettingController::class, 'index']);
            });
            Route::middleware('can:manage_settings')->group(function () {
                Route::patch('settings',               [SettingController::class, 'update']);
                Route::put('settings',                 [SettingController::class, 'update']);
                Route::post('settings/test-email',     [SettingController::class, 'sendTestEmail']);
            });

            // ✅ print-templates: قوالب الطباعة — قراءة لكل أعضاء الشركة، كتابة للمدراء (can:manage_print_templates)
            Route::get('print-templates',                    [PrintTemplateController::class, 'index']);
            // ✅ مكتبة القوالب الجاهزة — قبل {id} وإلا التُقطت كمعرّف قالب
            Route::get('print-templates/library',            [PrintTemplateController::class, 'library']);
            Route::post('print-templates/library/install',   [PrintTemplateController::class, 'installLibrary']);
            Route::get('print-templates/{id}',               [PrintTemplateController::class, 'show']);

            // الكتابة — للمالك/المدير (can:manage_print_templates)
            Route::middleware('can:manage_print_templates')->group(function () {
                Route::post('print-templates',                   [PrintTemplateController::class, 'store']);
                Route::put('print-templates/{id}',               [PrintTemplateController::class, 'update']);
                Route::delete('print-templates/{id}',            [PrintTemplateController::class, 'destroy']);
                Route::post('print-templates/{id}/set-default',  [PrintTemplateController::class, 'setDefault']);
                Route::post('print-templates/{id}/duplicate',    [PrintTemplateController::class, 'duplicate']);
                Route::post('print-templates/upload-logo',       [PrintTemplateController::class, 'uploadLogo']);
            });

            // ✅ email-templates: قوالب البريد الإلكتروني — قراءة لكل أعضاء الشركة،
            //    كتابة للمدراء (can:manage_settings — صفحة الإعدادات تفرضها أصلاً)
            Route::get('email-templates',                    [EmailTemplateController::class, 'index']);
            // ✅ رموز القوالب المدعومة — قبل {id} وإلا التُقطت كمعرّف قالب
            Route::get('email-templates/placeholders',       [EmailTemplateController::class, 'placeholders']);
            Route::get('email-templates/{id}',               [EmailTemplateController::class, 'show']);

            Route::middleware('can:manage_settings')->group(function () {
                Route::post('email-templates',                   [EmailTemplateController::class, 'store']);
                Route::put('email-templates/{id}',               [EmailTemplateController::class, 'update']);
                Route::delete('email-templates/{id}',            [EmailTemplateController::class, 'destroy']);
                Route::post('email-templates/{id}/set-default',  [EmailTemplateController::class, 'setDefault']);
            });

            // line-templates: قوالب أسطر المستندات — CRUD كامل
            Route::apiResource('line-templates', DocumentLineTemplateController::class);

            // pdf-export: تصدير PDF من HTML معبأ
            Route::post('pdf/export',                        [PdfExportController::class, 'export']);
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
