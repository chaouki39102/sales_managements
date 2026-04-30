# دليل التحول إلى Multi-Tenancy — Laravel 11+
## بناءً على هيكل قاعدة بياناتك الفعلي

---

> **الوضع الحالي:** الـ Migrations جاهزة (companies, company_user, company_id في الجداول الأساسية).  
> **ما يتبقى:** طبقة الكود بالكامل — Models, Scope, Middleware, Services, Tests.

---

## الفهرس

1. [بنية المشروع المقترحة](#بنية)
2. [CompanyContext — قلب النظام](#context)
3. [CompanyScope — العزل التلقائي](#scope)
4. [Trait HasCompany](#trait)
5. [تطبيق الـ Trait على النماذج](#models)
6. [Middleware — إدارة السياق](#middleware)
7. [Company Model + User Model](#company-model)
8. [Routes — هيكل الـ URL](#routes)
9. [تعديل Unique Constraints](#unique)
10. [Artisan Command — ترحيل البيانات](#command)
11. [Queue Jobs — التعامل مع السياق](#jobs)
12. [Feature Tests](#tests)
13. [قائمة التحقق النهائية](#checklist)

---

<a name="بنية"></a>
## 1. بنية المشروع المقترحة

```
app/
├── Models/
│   ├── Scopes/
│   │   └── CompanyScope.php
│   ├── Traits/
│   │   └── HasCompany.php
│   ├── Company.php
│   ├── Product.php
│   ├── Party.php
│   └── ...
├── Http/
│   ├── Middleware/
│   │   └── SetCompanyContext.php
│   └── Controllers/
│       └── CompanyController.php
├── Services/
│   └── CompanyContextService.php  ← جديد
└── Console/
    └── Commands/
        └── AssignCompanyToExistingRecords.php
```

---

<a name="context"></a>
## 2. CompanyContext — قلب النظام

هذا هو التغيير الأهم عن الخطة السابقة.  
**لا تعتمد على `session()` مباشرة في الـ Scope** — استخدم Service Container يعمل في كل البيئات (HTTP, Queue, Artisan).

```php
<?php
// app/Services/CompanyContextService.php
namespace App\Services;

class CompanyContextService
{
    private ?int $companyId = null;

    public function set(int $id): void
    {
        $this->companyId = $id;
    }

    public function get(): ?int
    {
        return $this->companyId;
    }

    public function has(): bool
    {
        return $this->companyId !== null;
    }

    public function clear(): void
    {
        $this->companyId = null;
    }

    /**
     * تنفيذ كود ضمن سياق شركة مؤقت — مفيد للـ Jobs والـ Artisan Commands
     */
    public function runAs(int $companyId, callable $callback): mixed
    {
        $previous = $this->companyId;
        $this->companyId = $companyId;

        try {
            return $callback();
        } finally {
            $this->companyId = $previous;
        }
    }
}
```

**تسجيله كـ Singleton في AppServiceProvider:**

```php
<?php
// app/Providers/AppServiceProvider.php
use App\Services\CompanyContextService;

public function register(): void
{
    $this->app->singleton(CompanyContextService::class);
}
```

---

<a name="scope"></a>
## 3. CompanyScope — العزل التلقائي

```php
<?php
// app/Models/Scopes/CompanyScope.php
namespace App\Models\Scopes;

use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // استخدام Service Container وليس session() مباشرة
        $context = app(CompanyContextService::class);

        if ($context->has()) {
            $builder->where(
                $model->getTable() . '.company_id',
                $context->get()
            );
        }
    }
}
```

---

<a name="trait"></a>
## 4. Trait HasCompany

```php
<?php
// app/Models/Traits/HasCompany.php
namespace App\Models\Traits;

use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasCompany
{
    /**
     * يُستدعى تلقائياً عند boot() للنموذج
     * اسم الدالة bootHasCompany() هو اتفاقية Laravel للـ Traits
     */
    protected static function bootHasCompany(): void
    {
        // 1. تطبيق الـ Global Scope على كل query
        static::addGlobalScope(new CompanyScope());

        // 2. تعيين company_id تلقائياً عند الإنشاء
        static::creating(function (self $model): void {
            if (empty($model->company_id)) {
                $context = app(CompanyContextService::class);
                if ($context->has()) {
                    $model->company_id = $context->get();
                }
            }
        });
    }

    // ===== Relations =====

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // ===== Scopes =====

    /**
     * تجاهل فلتر الشركة — للتقارير الموحدة أو Super Admin
     */
    public function scopeAllCompanies(Builder $query): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * جلب بيانات شركة محددة بغض النظر عن السياق الحالي
     */
    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class)
                     ->where($this->getTable() . '.company_id', $companyId);
    }
}
```

---

<a name="models"></a>
## 5. تطبيق الـ Trait على النماذج

طبّق `HasCompany` على كل النماذج التي تحتوي على `company_id` حسب migrations الخاصة بك:

```php
<?php
// app/Models/Product.php
namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasCompany, SoftDeletes;

    protected $fillable = [
        'company_id', 'name', 'ref', 'barcode',
        // ... باقي الحقول
    ];
}
```

**قائمة النماذج التي تحتاج `use HasCompany`:**

| النموذج | الجدول |
|---------|--------|
| `Product` | `products` |
| `Party` | `parties` |
| `Warehouse` | `warehouses` |
| `CommercialDocument` | `commercial_documents` |
| `CommercialDocumentLine` | `commercial_document_lines` |
| `StockMovement` | `stock_movements` |
| `ProductLot` | `product_lots` |
| `ProductPackaging` | `product_packagings` |
| `ProductPrice` | `product_prices` |
| `QuantityDiscount` | `quantity_discounts` |
| `FiscalYear` | `fiscal_years` |
| `Payment` | `payments` |
| `Expense` | `expenses` |
| `TreasuryAccount` | `treasury_accounts` |
| `OpeningBalanceStock` | `opening_balances_stock` |
| `OpeningBalanceParty` | `opening_balances_parties` |
| `NumberingSeries` | `numbering_series` |
| `Check` | `checks` |

> **ملاحظة:** جدول `users` يحتوي على `company_id` لكن لا تضع `HasCompany` على `User` Model — المستخدم يتعامل مع شركات متعددة عبر pivot table. `company_id` في `users` هو "آخر شركة نشطة" فقط.

---

<a name="middleware"></a>
## 6. Middleware — إدارة السياق

```php
<?php
// app/Http/Middleware/SetCompanyContext.php
namespace App\Http\Middleware;

use App\Models\Company;
use App\Services\CompanyContextService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetCompanyContext
{
    public function __construct(
        private readonly CompanyContextService $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // 1. جلب slug الشركة من الـ route
        $slug = $request->route('company');

        if (! $slug) {
            abort(404);
        }

        // 2. جلب الشركة
        $company = Company::where('slug', $slug)
                          ->where('is_active', true)
                          ->firstOrFail();

        // 3. التحقق من صلاحية المستخدم
        $user = Auth::user();
        if (! $user->companies()->where('companies.id', $company->id)->exists()) {
            abort(403, 'ليس لديك صلاحية الوصول لهذه المؤسسة.');
        }

        // 4. تعيين السياق في الـ Service (يعمل مع HTTP + Queue + CLI)
        $this->context->set($company->id);

        // 5. تحديث آخر شركة نشطة للمستخدم
        $user->update(['company_id' => $company->id]);

        // 6. مشاركة الشركة مع جميع الـ Views
        view()->share('currentCompany', $company);

        // 7. إضافة company للـ request (مفيد في Controllers)
        $request->merge(['_company' => $company]);

        return $next($request);
    }
}
```

**تسجيله في Bootstrap (Laravel 11 — بدون Kernel.php):**

```php
// bootstrap/app.php
use App\Http\Middleware\SetCompanyContext;

->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'company' => SetCompanyContext::class,
    ]);
})
```

---

<a name="company-model"></a>
## 7. Company Model + User Model

```php
<?php
// app/Models/Company.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Company extends Model
{
    protected $fillable = [
        'name', 'commercial_name', 'slug', 'email', 'phone',
        'address', 'nif', 'nis', 'rc', 'is_active',
        'legal_form_id', 'wilaya_id', 'commune_id', 'owner_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $company): void {
            if (empty($company->slug)) {
                $company->slug = Str::slug($company->name);
            }
        });
    }

    // ===== Relations =====

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
                    ->withPivot('is_default')
                    ->withTimestamps();
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    // ... باقي العلاقات

    // ===== Accessors =====

    public function getRouteKeyName(): string
    {
        return 'slug'; // Route Model Binding باستخدام slug
    }
}
```

```php
<?php
// app/Models/User.php — الإضافات فقط
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// أضف هذه الدوال للـ User Model الحالي:

public function companies(): BelongsToMany
{
    return $this->belongsToMany(Company::class)
                ->withPivot('is_default')
                ->withTimestamps();
}

public function defaultCompany(): BelongsTo
{
    return $this->belongsTo(Company::class, 'company_id');
}

public function hasAccessToCompany(int|Company $company): bool
{
    $id = $company instanceof Company ? $company->id : $company;
    return $this->companies()->where('companies.id', $id)->exists();
}
```

---

<a name="routes"></a>
## 8. Routes — هيكل الـ URL

```php
<?php
// routes/web.php

use App\Http\Controllers\CompanyController;

// ===== صفحات بدون سياق شركة =====
Route::middleware(['auth'])->group(function () {
    Route::get('/companies/select', [CompanyController::class, 'select'])
         ->name('companies.select');
    Route::post('/companies/switch', [CompanyController::class, 'switch'])
         ->name('companies.switch');
    Route::get('/companies/create', [CompanyController::class, 'create'])
         ->name('companies.create');
    Route::post('/companies', [CompanyController::class, 'store'])
         ->name('companies.store');
});

// ===== كل routes التطبيق ضمن سياق شركة =====
Route::middleware(['auth', 'company'])
     ->prefix('{company}')          // {company} → Route Model Binding عبر slug
     ->name('{company}.')
     ->group(function () {

    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Products
    Route::resource('products', ProductController::class);

    // Parties
    Route::resource('parties', PartyController::class);

    // Commercial Documents
    Route::resource('documents', CommercialDocumentController::class);

    // Stock
    Route::resource('warehouses', WarehouseController::class);
    Route::resource('stock-movements', StockMovementController::class);

    // Finance
    Route::resource('treasury-accounts', TreasuryAccountController::class);
    Route::resource('payments', PaymentController::class);

    // Settings
    Route::resource('fiscal-years', FiscalYearController::class);
    Route::resource('numbering-series', NumberingSeriesController::class);
});
```

**مثال على الـ URLs الناتجة:**
- `/my-company/products`
- `/my-company/documents/create`
- `/my-company/parties/15/edit`

---

<a name="unique"></a>
## 9. تعديل Unique Constraints المهم

بعد إضافة `company_id`، يجب مراجعة الـ `unique` constraints الحالية.  
مثال: `check_number` في جدول `checks` هو `unique()` عالمي — هذا خطأ في بيئة Multi-Tenant.

**أنشئ migration جديد:**

```php
<?php
// database/migrations/2026_05_01_000004_fix_unique_constraints_for_multitenancy.php

return new class extends Migration
{
    public function up(): void
    {
        // checks: check_number يجب أن يكون فريداً داخل الشركة فقط
        Schema::table('checks', function (Blueprint $table) {
            $table->dropUnique(['check_number']);
            $table->unique(['company_id', 'check_number'], 'checks_company_number_unique');
        });

        // warehouses: name + code يجب أن يكونا فريدين داخل الشركة
        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->dropUnique(['code']);
            $table->unique(['company_id', 'name'], 'warehouses_company_name_unique');
            $table->unique(['company_id', 'code'], 'warehouses_company_code_unique');
        });

        // treasury_accounts: code فريد داخل الشركة
        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->unique(['company_id', 'code'], 'treasury_accounts_company_code_unique');
        });

        // numbering_series: الـ unique الحالي يشمل company_id؟ إذا لا، أصلحه
        // (راجع migration الحالية — تضمنت: unique(['document_type_id', 'warehouse_id', 'prefix']))
        // يجب إضافة company_id:
        Schema::table('numbering_series', function (Blueprint $table) {
            $table->dropUnique('numbering_series_unique');
            $table->unique(
                ['company_id', 'document_type_id', 'warehouse_id', 'prefix'],
                'numbering_series_company_unique'
            );
        });

        // parties: nif وemail فريدان عالمياً حالياً — خطأ في Multi-Tenant
        Schema::table('parties', function (Blueprint $table) {
            $table->dropUnique(['nif']);
            $table->dropUnique(['email']);
            $table->unique(['company_id', 'nif'], 'parties_company_nif_unique');
            $table->unique(['company_id', 'email'], 'parties_company_email_unique');
        });
    }

    public function down(): void
    {
        // عكس التغييرات...
    }
};
```

---

<a name="command"></a>
## 10. Artisan Command — ترحيل البيانات الحالية

```php
<?php
// app/Console/Commands/AssignCompanyToExistingRecords.php
namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssignCompanyToExistingRecords extends Command
{
    protected $signature = 'tenancy:assign
                            {--company-id= : معرف الشركة الافتراضية}
                            {--create-default : إنشاء شركة افتراضية إذا لم توجد}
                            {--dry-run : عرض ما سيتم دون تنفيذ}';

    protected $description = 'تعيين company_id لجميع السجلات الحالية';

    private array $tables = [
        'products', 'product_packagings', 'product_prices',
        'quantity_discounts', 'product_lots', 'stock_movements',
        'commercial_documents', 'commercial_document_lines',
        'parties', 'warehouses', 'fiscal_years', 'payments',
        'expenses', 'treasury_accounts', 'opening_balances_stock',
        'opening_balances_parties', 'numbering_series', 'checks',
    ];

    public function handle(): int
    {
        $companyId = $this->resolveCompanyId();

        if (! $companyId) {
            $this->error('لم يتم تحديد شركة. استخدم --company-id أو --create-default');
            return Command::FAILURE;
        }

        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('وضع المعاينة — لن يتم تغيير أي بيانات');
        }

        $this->info("سيتم تعيين company_id = {$companyId} لجميع السجلات بدون شركة");
        $this->newLine();

        DB::transaction(function () use ($companyId, $isDryRun) {
            foreach ($this->tables as $table) {
                $this->processTable($table, $companyId, $isDryRun);
            }

            $this->linkUsersToCompany($companyId, $isDryRun);
        });

        $this->newLine();
        $this->info('✅ اكتمل بنجاح!');

        return Command::SUCCESS;
    }

    private function resolveCompanyId(): ?int
    {
        if ($id = $this->option('company-id')) {
            return (int) $id;
        }

        if ($this->option('create-default')) {
            $company = Company::firstOrCreate(
                ['slug' => 'default'],
                ['name' => 'الشركة الافتراضية', 'is_active' => true]
            );
            $this->info("الشركة الافتراضية: [{$company->id}] {$company->name}");
            return $company->id;
        }

        return null;
    }

    private function processTable(string $table, int $companyId, bool $isDryRun): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'company_id')) {
            $this->warn("  ⚠ جدول '{$table}' غير موجود أو بدون company_id — تجاهل");
            return;
        }

        $count = DB::table($table)->whereNull('company_id')->count();

        if ($count === 0) {
            $this->line("  ✓ {$table}: جميع السجلات لديها company_id");
            return;
        }

        if (! $isDryRun) {
            DB::table($table)->whereNull('company_id')->update(['company_id' => $companyId]);
        }

        $this->info("  → {$table}: تم تحديث {$count} سجل" . ($isDryRun ? ' (معاينة)' : ''));
    }

    private function linkUsersToCompany(int $companyId, bool $isDryRun): void
    {
        $users = User::doesntHave('companies')->get();

        foreach ($users as $user) {
            if (! $isDryRun) {
                $user->companies()->attach($companyId, ['is_default' => true]);
                $user->update(['company_id' => $companyId]);
            }
            $this->info("  → ربط المستخدم [{$user->id}] {$user->name} بالشركة");
        }
    }
}
```

**تشغيله:**

```bash
# معاينة أولاً
php artisan tenancy:assign --create-default --dry-run

# تنفيذ فعلي
php artisan tenancy:assign --create-default

# أو بشركة موجودة
php artisan tenancy:assign --company-id=1
```

---

<a name="jobs"></a>
## 11. Queue Jobs — التعامل مع السياق

**المشكلة:** الـ Jobs تعمل خارج الـ HTTP request، لذا لا يوجد Middleware يضبط السياق.

**الحل:** استخدم `runAs()` من الـ Service، وخزّن `company_id` في الـ Job نفسه:

```php
<?php
// app/Jobs/GenerateMonthlyReport.php
namespace App\Jobs;

use App\Services\CompanyContextService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class GenerateMonthlyReport implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        private readonly int $companyId,  // ← احفظ company_id دائماً في الـ Job
        private readonly int $year,
        private readonly int $month,
    ) {}

    public function handle(CompanyContextService $context): void
    {
        // تشغيل ضمن سياق الشركة الصحيح
        $context->runAs($this->companyId, function () {
            // هنا كل الـ Queries ستُفلتر تلقائياً بـ company_id
            $products = Product::where('active', true)->get();
            // ...
        });
    }
}

// كيفية الإطلاق من Controller:
GenerateMonthlyReport::dispatch(
    companyId: $currentCompany->id,
    year: 2026,
    month: 4
);
```

---

<a name="tests"></a>
## 12. Feature Tests

```php
<?php
// tests/Feature/Tenancy/DataIsolationTest.php
namespace Tests\Feature\Tenancy;

use App\Models\Company;
use App\Models\Product;
use App\Models\User;
use App\Services\CompanyContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Company $companyA;
    private Company $companyB;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyA = Company::factory()->create(['slug' => 'company-a']);
        $this->companyB = Company::factory()->create(['slug' => 'company-b']);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->companyA, ['is_default' => true]);
        $this->user->companies()->attach($this->companyB);
    }

    /** @test */
    public function user_sees_only_his_company_products(): void
    {
        // إنشاء منتجات لكل شركة
        Product::factory()->create([
            'name' => 'منتج أ',
            'company_id' => $this->companyA->id,
        ]);
        Product::factory()->create([
            'name' => 'منتج ب',
            'company_id' => $this->companyB->id,
        ]);

        // تعيين سياق الشركة أ
        $this->actingAs($this->user);
        app(CompanyContextService::class)->set($this->companyA->id);

        $products = Product::all();

        $this->assertCount(1, $products);
        $this->assertEquals('منتج أ', $products->first()->name);
    }

    /** @test */
    public function product_gets_company_id_automatically_on_create(): void
    {
        $this->actingAs($this->user);
        app(CompanyContextService::class)->set($this->companyA->id);

        $product = Product::create([
            'name' => 'منتج تجريبي',
            'active' => true,
        ]);

        $this->assertEquals($this->companyA->id, $product->company_id);
    }

    /** @test */
    public function user_cannot_access_other_company_data(): void
    {
        $this->actingAs($this->user);

        // محاولة الوصول لشركة المستخدم ليس عضواً فيها
        $otherCompany = Company::factory()->create(['slug' => 'other']);

        $response = $this->get("/{$otherCompany->slug}/products");

        $response->assertForbidden();
    }

    /** @test */
    public function scope_all_companies_bypasses_filter(): void
    {
        Product::factory()->create(['company_id' => $this->companyA->id]);
        Product::factory()->create(['company_id' => $this->companyB->id]);

        app(CompanyContextService::class)->set($this->companyA->id);

        // بدون الـ Scope: يرى المنتجين
        $all = Product::allCompanies()->count();
        $this->assertEquals(2, $all);

        // مع الـ Scope: يرى منتج واحد فقط
        $filtered = Product::count();
        $this->assertEquals(1, $filtered);
    }
}
```

---

<a name="checklist"></a>
## 13. قائمة التحقق النهائية

### ✅ الـ Migrations (مكتملة)
- [x] جدول `companies`
- [x] جدول `company_user`
- [x] `company_id` في الجداول الأساسية
- [x] الفهارس المركبة
- [ ] **تعديل الـ Unique Constraints** (migration جديد)

### ✅ الكود
- [ ] `CompanyContextService` — Singleton
- [ ] `CompanyScope`
- [ ] `HasCompany` Trait
- [ ] `use HasCompany` في 18 نموذج
- [ ] `SetCompanyContext` Middleware
- [ ] تسجيل الـ Middleware في `bootstrap/app.php`
- [ ] تحديث `Company` Model
- [ ] إضافة `companies()` relation في `User` Model
- [ ] تحديث الـ Routes

### ✅ البيانات
- [ ] تشغيل `php artisan tenancy:assign --dry-run`
- [ ] تشغيل `php artisan tenancy:assign --create-default`

### ✅ الاختبارات
- [ ] عزل البيانات بين الشركات
- [ ] تعيين `company_id` تلقائياً
- [ ] منع الوصول لشركة غير مصرح بها
- [ ] Jobs تعمل بالسياق الصحيح

---

## ملاحظات مهمة

**1. لماذا `CompanyContextService` وليس `session()`؟**
- `session()` لا تعمل في Queue Jobs ولا في Artisan Commands
- الـ Service يعمل في جميع البيئات
- أسهل في الـ Testing (يمكن inject مباشرة)

**2. لماذا `bootHasCompany()` وليس `boot()`؟**
- Laravel يستدعي `bootTraitName()` تلقائياً عند وجود Trait
- استخدام `boot()` في Trait يتعارض مع `boot()` في النموذج

**3. الـ `commercial_document_lines` و `company_id`**
- صحيح إضافة `company_id` رغم ارتباطها بالجدول الأب
- يتيح queries مباشرة على الأسطر بدون JOIN
- الفهارس المركبة في migrations تعوض أي تكرار

**4. `users` و `HasCompany`**
- لا تضع `HasCompany` على User Model
- المستخدم ينتمي لشركات متعددة — لا معنى لفلترته
- `company_id` في `users` = آخر شركة نشطة فقط
