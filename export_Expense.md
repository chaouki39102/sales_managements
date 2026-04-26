# Module Export: Expense
Generated at: 2026-04-26 11:38:41

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models/ExpenseCategory.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * ExpenseCategory Model
 *
 * Table: expense_categories
 * Categorizes business expenses
 */
#[Cacheable]
class ExpenseCategory extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'expense_categories';

    protected $fillable = [
        'name',
        'code',
        'description',
        'parent_id',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'expenses', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['expense_categories'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/FiscalYear.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * FiscalYear Model
 *
 * Table: fiscal_years
 * Manages fiscal/financial years for accounting periods
 */
#[Cacheable]
class FiscalYear extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'fiscal_years';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_closed',
        'closed_at',
        'closed_by',
        'is_current',
        'closing_notes',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
        'closed_at' => 'date',
        'is_current' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'is_closed',
        'is_current',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'start_date',
        'end_date',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'closedBy',
        'commercialDocuments',
        'stockMovements',
        'payments',
        'expenses',
        'openingBalancesStock',
        'openingBalancesParties',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'start_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['fiscal_years'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function openingBalancesStock(): HasMany
    {
        return $this->hasMany(OpeningBalanceStock::class);
    }

    public function openingBalancesParties(): HasMany
    {
        return $this->hasMany(OpeningBalanceParty::class);
    }

    // -------------------- Scopes --------------------

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_current', true);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('is_closed', false);
    }

    public function scopeClosed(Builder $query): Builder
    {
        return $query->where('is_closed', true);
    }

    // -------------------- Helpers --------------------

    public function close(int $userId, ?string $notes = null): bool
    {
        if ($this->is_closed) {
            return false;
        }

        return $this->update([
            'is_closed' => true,
            'closed_at' => now(),
            'closed_by' => $userId,
            'closing_notes' => $notes,
            'is_current' => false,
        ]);
    }

    public function setCurrent(): bool
    {
        // Set all other years as non-current
        static::where('id', '!=', $this->id)->update(['is_current' => false]);

        return $this->update(['is_current' => true]);
    }

    public function isActive(): bool
    {
        return !$this->is_closed && now()->between($this->start_date, $this->end_date);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/Traits/BelongsToFiscalYear.php
```php
<?php

namespace App\Models\Traits;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Trait لمنع التعديل على سنة مالية مقفلة
 * مع تحسينات الأداء وسلامة البيانات
 */
trait BelongsToFiscalYear
{
    /**
     * Cache لتخزين حالات السنوات المقفلة
     * يتم تحديثها فقط عند إقفال سنة جديدة
     */
    protected static array $closedYearsCache = [];

    protected static function bootBelongsToFiscalYear(): void
    {
        // تحميل السنوات المقفلة مرة واحدة فقط
        static::loadClosedYears();

        // 1. منع الإنشاء في سنة مقفلة
        static::creating(function ($model) {
            $model->validateFiscalYearStatus();
        });

        // 2. منع التعديل في سنة مقفلة
        static::updating(function ($model) {
            // تحقق من السنة الأصلية
            if ($model->getOriginal('fiscal_year_id')) {
                $model->validateFiscalYearStatus($model->getOriginal('fiscal_year_id'));
            }

            // تحقق من السنة الجديدة إذا تم تغييرها
            if ($model->isDirty('fiscal_year_id')) {
                $model->validateFiscalYearStatus();
            }
        });

        // 3. منع الحذف من سنة مقفلة
        static::deleting(function ($model) {
            $model->validateFiscalYearStatus();
        });
    }

    /**
     * تحميل السنوات المقفلة من Cache أو DB (مرة واحدة فقط)
     */
    protected static function loadClosedYears(): void
    {
        if (empty(static::$closedYearsCache)) {
            static::$closedYearsCache = Cache::remember(
                'closed_fiscal_years',
                now()->addHours(24), // يتم تحديثه عند إقفال سنة
                fn() => FiscalYear::where('is_closed', true)
                    ->pluck('id')
                    ->toArray()
            );
        }
    }

    /**
     * التحقق من حالة السنة المالية (بدون استعلامات إضافية)
     */
    protected function validateFiscalYearStatus(?int $yearId = null): void
    {
        $yearId = $yearId ?? $this->fiscal_year_id;

        if (!$yearId) {
            return; // لا سنة مالية = العملية مسموحة
        }

        // ✅ فحص سريع من الـ Cache
        if (in_array($yearId, static::$closedYearsCache)) {
            throw new FiscalYearClosedException(
                "العملية ممنوعة: السنة المالية مقفلة (ID: {$yearId})"
            );
        }
    }

    /**
     * علاقة Eloquent مع السنة المالية
     */
    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    /**
     * يتم استدعاؤها عند إقفال سنة مالية لتحديث الـ Cache
     */
    public static function refreshClosedYearsCache(): void
    {
        Cache::forget('closed_fiscal_years');
        static::$closedYearsCache = [];
        static::loadClosedYears();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/Expense.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;

/**
 * Expense Model
 *
 * Table: expenses
 * Tracks business expenses and operational costs
 */
#[Cacheable]
class Expense extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'expenses';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'expense_number',
        'date',
        'amount',
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'description',
        'reference',
        'has_attachments',
        'status',
        'is_paid',
        'is_recurring',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:4',
        'has_attachments' => 'boolean',
        'is_paid' => 'boolean',
        'is_recurring' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'expense_number',
        'description',
        'reference',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'status',
        'is_paid',
        'is_recurring',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'expense_number',
        'date',
        'amount',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'expenseCategory',
        'fiscalYear',
        'paymentMode',
        'treasuryAccount',
        'party',
        'attachments',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['expenses'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function paymentMode(): BelongsTo
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // -------------------- Scopes --------------------

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('is_paid', true);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('is_paid', false);
    }

    public function scopeRecurring(Builder $query): Builder
    {
        return $query->where('is_recurring', true);
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models\Expense.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;

/**
 * Expense Model
 *
 * Table: expenses
 * Tracks business expenses and operational costs
 */
#[Cacheable]
class Expense extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'expenses';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'expense_number',
        'date',
        'amount',
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'description',
        'reference',
        'has_attachments',
        'status',
        'is_paid',
        'is_recurring',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:4',
        'has_attachments' => 'boolean',
        'is_paid' => 'boolean',
        'is_recurring' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'expense_number',
        'description',
        'reference',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'status',
        'is_paid',
        'is_recurring',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'expense_number',
        'date',
        'amount',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'expenseCategory',
        'fiscalYear',
        'paymentMode',
        'treasuryAccount',
        'party',
        'attachments',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['expenses'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function paymentMode(): BelongsTo
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // -------------------- Scopes --------------------

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('is_paid', true);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('is_paid', false);
    }

    public function scopeRecurring(Builder $query): Builder
    {
        return $query->where('is_recurring', true);
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models\ExpenseCategory.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * ExpenseCategory Model
 *
 * Table: expense_categories
 * Categorizes business expenses
 */
#[Cacheable]
class ExpenseCategory extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'expense_categories';

    protected $fillable = [
        'name',
        'code',
        'description',
        'parent_id',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'expenses', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['expense_categories'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/User.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * User Model
 *
 * Table: users
 * Manages system users with authentication and profile management
 */
#[Cacheable]
class User extends Authenticatable
{
    use HasApiTokens,
        HasFactory,
        Notifiable,
        HasRoles,
        SoftDeletes,
        HasStandardizedConfiguration;

    protected $table = 'users';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'username',
        'phone',
        'avatar',
        'bio',
        'job_title',
        'birth_date',
        'gender_id',
        'national_id',
        'address',
        'commune_id',
        'wilaya_id',
        'role_id',
        'last_login_at',
        'last_login_ip',
        'register_ip',
        'register_user_agent',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    // -------------------- Hidden --------------------
    protected $hidden = [
        'password',
        'remember_token',
        'national_id',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'email_verified_at' => 'datetime',
        'birth_date' => 'date',
        'last_login_at' => 'datetime',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['full_address'];

    // -------------------- Spatie Permission --------------------
    protected $guard_name = 'web';

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'email',
        'username',
        'phone',
        'job_title',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'gender_id',
        'commune_id',
        'wilaya_id',
        'role_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'email',
        'created_at',
        'last_login_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'gender',
        'commune',
        'wilaya',
        'role',
        'roles',
        'permissions',
        'createdBy',
        'updatedBy',
        'deletedBy',
        'commercialDocuments',
        'payments',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['users'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'created_by');
    }

    // -------------------- Mutators --------------------

    public function setPasswordAttribute($value)
    {
        if (strlen($value) === 60 && str_starts_with($value, '$2y$')) {
            $this->attributes['password'] = $value;
            return;
        }
        $this->attributes['password'] = \Illuminate\Support\Facades\Hash::make($value);
    }

    // -------------------- Accessors --------------------

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }

    // -------------------- Helpers --------------------

    public function updateLastLogin(): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/DocumentType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * DocumentType Model
 *
 * Table: document_types
 * Defines types of commercial documents
 */
#[Cacheable]
class DocumentType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'document_types';

    protected $fillable = [
        'name',
        'name_latin',
        'code',
        'description',
        'document_base_operation_id',
        'affects_stock_direction',
        'requires_party',
        'affects_accounting',
        'is_printable',
        'print_template',
        'active',
        'display_order',
    ];

    protected $casts = [
        'affects_stock_direction' => 'integer',
        'requires_party' => 'boolean',
        'affects_accounting' => 'boolean',
        'is_printable' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'name_latin', 'code', 'description'];
    public static array $filterable = ['document_base_operation_id', 'active', 'requires_party'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentBaseOperation', 'numberingSeries', 'commercialDocuments'];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_types', 'lookups'];

    public function documentBaseOperation(): BelongsTo
    {
        return $this->belongsTo(DocumentBaseOperation::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function affectsStockIn(): bool
    {
        return $this->affects_stock_direction === 1;
    }

    public function affectsStockOut(): bool
    {
        return $this->affects_stock_direction === -1;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/CommercialDocumentLine.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * CommercialDocumentLine Model
 *
 * Table: commercial_document_lines
 * Stores line items for commercial documents
 */
#[Cacheable]
class CommercialDocumentLine extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'commercial_document_lines';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'commercial_document_id',
        'product_variant_id',
        'line_order',
        'description',
        'quantity',
        'delivered_quantity',
        'returned_quantity',
        'unit_price_ht',
        'discount_percentage',
        'discount_amount',
        'tva_rate',
        'total_ht',
        'total_tva',
        'total_ttc',
        'stock_lot_id',
        'is_auto_split',
        'parent_line_id',
        'line_attributes',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'line_order' => 'integer',
        'quantity' => 'decimal:3',
        'delivered_quantity' => 'decimal:3',
        'returned_quantity' => 'decimal:3',
        'unit_price_ht' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'tva_rate' => 'decimal:2',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'is_auto_split' => 'boolean',
        'line_attributes' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'description',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'commercial_document_id',
        'product_variant_id',
        'stock_lot_id',
        'is_auto_split',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'line_order',
        'quantity',
        'total_ttc',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'commercialDocument',
        'productVariant',
        'stockLot',
        'parentLine',
        'childLines',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'line_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 50;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 200;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['commercial_document_lines'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function commercialDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function parentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function childLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'commercial_document_line_id');
    }

    // -------------------- Scopes --------------------

    public function scopeParentLines(Builder $query): Builder
    {
        return $query->whereNull('parent_line_id');
    }

    public function scopeChildLines(Builder $query): Builder
    {
        return $query->whereNotNull('parent_line_id');
    }

    // -------------------- Helpers --------------------

    public function getRemainingQuantity(): float
    {
        return $this->quantity - $this->delivered_quantity - $this->returned_quantity;
    }

    public function isFullyDelivered(): bool
    {
        return $this->getRemainingQuantity() <= 0;
    }

    public function hasDiscount(): bool
    {
        return $this->discount_percentage > 0 || $this->discount_amount > 0;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/ProductVariant.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * ProductVariant Model
 *
 * Table: product_variants
 * Represents sellable SKUs with unique pricing and inventory
 */
#[Cacheable]
class ProductVariant extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'product_variants';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'product_id',
        'ref',
        'barcode',
        'variant_name',
        'unit_id',
        'tva_id',
        'last_purchase_price',
        'average_cost_price',
        'default_selling_price_ht',
        'manages_stock',
        'allow_negative_stock',
        'has_lots',
        'has_expiration_date',
        'min_stock_alert',
        'max_stock_alert',
        'manages_quantity_discounts',
        'weight',
        'volume',
        'length',
        'width',
        'height',
        'variant_attributes',
        'valuation_method_id',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'last_purchase_price' => 'decimal:4',
        'average_cost_price' => 'decimal:4',
        'default_selling_price_ht' => 'decimal:4',
        'manages_stock' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'has_lots' => 'boolean',
        'has_expiration_date' => 'boolean',
        'min_stock_alert' => 'decimal:4',
        'max_stock_alert' => 'decimal:4',
        'manages_quantity_discounts' => 'boolean',
        'weight' => 'decimal:3',
        'volume' => 'decimal:3',
        'length' => 'decimal:4',
        'width' => 'decimal:4',
        'height' => 'decimal:4',
        'variant_attributes' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['current_stock', 'is_low_stock'];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'ref',
        'barcode',
        'variant_name',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_id',
        'unit_id',
        'tva_id',
        'valuation_method_id',
        'manages_stock',
        'has_lots',
        'has_expiration_date',
        'manages_quantity_discounts',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'ref',
        'variant_name',
        'default_selling_price_ht',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'product',
        'unit',
        'tva',
        'valuationMethod',
        'prices',
        'quantityDiscounts',
        'stockMovements',
        'productLots',
        'commercialDocumentLines',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'ref';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['product_variants', 'products'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [
        'prices',
        'stockMovements',
        'productLots',
    ];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tva(): BelongsTo
    {
        return $this->belongsTo(Tva::class);
    }

    public function valuationMethod(): BelongsTo
    {
        return $this->belongsTo(InventoryValuationMethod::class, 'valuation_method_id');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductVariantPrice::class);
    }

    public function quantityDiscounts(): HasMany
    {
        return $this->hasMany(QuantityDiscount::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function productLots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function commercialDocumentLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }

    // -------------------- Scopes --------------------

    public function scopeManagesStock(Builder $query): Builder
    {
        return $query->where('manages_stock', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereRaw('
            (SELECT COALESCE(SUM(stock_balance_after), 0)
             FROM stock_movements
             WHERE product_variant_id = product_variants.id
             ORDER BY movement_date DESC, id DESC
             LIMIT 1) <= min_stock_alert
        ');
    }

    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->whereRaw('
            (SELECT COALESCE(SUM(stock_balance_after), 0)
             FROM stock_movements
             WHERE product_variant_id = product_variants.id
             ORDER BY movement_date DESC, id DESC
             LIMIT 1) <= 0
        ');
    }

    // -------------------- Accessors --------------------

    /**
     * Get current stock quantity across all warehouses
     */
    public function getCurrentStockAttribute(): float
    {
        return $this->stockMovements()
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0;
    }

    /**
     * Check if stock is below minimum alert level
     */
    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) {
            return false;
        }

        return $this->current_stock <= $this->min_stock_alert;
    }

    // -------------------- Helpers --------------------

    /**
     * Get stock by warehouse
     */
    public function getStockByWarehouse(int $warehouseId): float
    {
        return $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0;
    }

    /**
     * Get price for specific price level
     */
    public function getPriceForLevel(int $priceLevelId): ?float
    {
        return $this->prices()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->where('valid_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('valid_to')
                    ->orWhere('valid_to', '>=', now());
            })
            ->value('price');
    }

    /**
     * Get applicable quantity discount
     */
    public function getQuantityDiscount(float $quantity): ?QuantityDiscount
    {
        if (!$this->manages_quantity_discounts) {
            return null;
        }

        return $this->quantityDiscounts()
            ->where('active', true)
            ->where('min_quantity', '<=', $quantity)
            ->where(function ($q) use ($quantity) {
                $q->whereNull('max_quantity')
                    ->orWhere('max_quantity', '>=', $quantity);
            })
            ->where('valid_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('valid_to')
                    ->orWhere('valid_to', '>=', now());
            })
            ->orderBy('tier_order')
            ->first();
    }

    /**
     * Calculate final price with quantity discount
     */
    public function calculateFinalPrice(float $quantity, ?int $priceLevelId = null): float
    {
        $basePrice = $priceLevelId
            ? $this->getPriceForLevel($priceLevelId)
            : $this->default_selling_price_ht;

        if (!$basePrice) {
            return 0;
        }

        $discount = $this->getQuantityDiscount($quantity);
        if (!$discount) {
            return $basePrice;
        }

        if ($discount->discount_percentage) {
            return $basePrice * (1 - $discount->discount_percentage / 100);
        }

        return max(0, $basePrice - $discount->discount_per_unit);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/ProductLot.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * ProductLot Model
 *
 * Table: product_lots
 * Manages product batches/lots with FIFO tracking
 */
#[Cacheable]
class ProductLot extends Model
{
    use HasStandardizedConfiguration, SoftDeletes;

    protected $table = 'product_lots';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'lot_number',
        'product_variant_id',
        'warehouse_id',
        'manufacturing_date',
        'expiration_date',
        'purchase_date',
        'purchase_price',
        'legal_selling_price',
        'margin_percentage',
        'original_quantity',
        'remaining_quantity',
        'stock_movement_id',
        'supplier_lot_number',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:4',
        'legal_selling_price' => 'decimal:4',
        'margin_percentage' => 'decimal:4',
        'original_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['is_depleted', 'is_expired'];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'lot_number',
        'supplier_lot_number',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_variant_id',
        'warehouse_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'lot_number',
        'purchase_date',
        'expiration_date',
        'remaining_quantity',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'productVariant',
        'warehouse',
        'stockMovement',
        'commercialDocumentLines',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'purchase_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 20;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['product_lots'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    public function commercialDocumentLines()
    {
        return $this->hasMany(CommercialDocumentLine::class, 'stock_lot_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'stock_lot_id');
    }

    // -------------------- Scopes --------------------

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('remaining_quantity', '>', 0)
            ->where('active', true);
    }

    public function scopeDepleted(Builder $query): Builder
    {
        return $query->where('remaining_quantity', '<=', 0);
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expiration_date')
            ->where('expiration_date', '<', now());
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereNotNull('expiration_date')
            ->whereBetween('expiration_date', [now(), now()->addDays($days)]);
    }

    public function scopeFifoOrder(Builder $query): Builder
    {
        return $query->orderBy('purchase_date')->orderBy('id');
    }

    // -------------------- Accessors --------------------

    public function getIsDepletedAttribute(): bool
    {
        return $this->remaining_quantity <= 0;
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiration_date && $this->expiration_date->isPast();
    }

    public function getTotalCostAttribute(): float
    {
        return $this->original_quantity * $this->purchase_price;
    }

    public function getRemainingValueAttribute(): float
    {
        return $this->remaining_quantity * $this->purchase_price;
    }

    // -------------------- Helpers --------------------

    public function decreaseQuantity(float $quantity): bool
    {
        if ($this->remaining_quantity < $quantity) {
            return false;
        }

        return $this->decrement('remaining_quantity', $quantity);
    }

    public function increaseQuantity(float $quantity): bool
    {
        return $this->increment('remaining_quantity', $quantity);
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiration_date
            && $this->expiration_date->isFuture()
            && $this->expiration_date->diffInDays(now()) <= $days;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/Payment.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;

/**
 * Payment Model
 *
 * Table: payments
 * Manages all payment transactions
 */
#[Cacheable]
class Payment extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'payments';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'payment_number',
        'payment_date',
        'amount',
        'currency_id',
        'amount_local',
        'payment_mode_id',
        'treasury_account_id',
        'check_id',
        'party_id',
        'fiscal_year_id',
        'reference',
        'bank_reference',
        'notes',
        'status',
        'is_reconciled',
        'reconciliation_date',
        'clearing_date',
        'user_id',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:4',
        'amount_local' => 'decimal:4',
        'is_reconciled' => 'boolean',
        'reconciliation_date' => 'date',
        'clearing_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'payment_number',
        'reference',
        'bank_reference',
        'notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'payment_mode_id',
        'treasury_account_id',
        'check_id',
        'party_id',
        'fiscal_year_id',
        'currency_id',
        'user_id',
        'status',
        'is_reconciled',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'payment_number',
        'payment_date',
        'amount',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'currency',
        'paymentMode',
        'treasuryAccount',
        'check',
        'party',
        'fiscalYear',
        'user',
        'commercialDocuments',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'payment_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['payments'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = ['commercialDocuments'];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function paymentMode(): BelongsTo
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function check(): BelongsTo
    {
        return $this->belongsTo(Check::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commercialDocuments(): BelongsToMany
    {
        return $this->belongsToMany(CommercialDocument::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }

    // -------------------- Scopes --------------------

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeReconciled(Builder $query): Builder
    {
        return $query->where('is_reconciled', true);
    }

    public function scopeUnreconciled(Builder $query): Builder
    {
        return $query->where('is_reconciled', false);
    }

    // -------------------- Helpers --------------------

    public function getTotalApplied(): float
    {
        return $this->commercialDocuments()->sum('document_payment.amount_applied');
    }

    public function getUnappliedAmount(): float
    {
        return $this->amount - $this->getTotalApplied();
    }

    public function isFullyApplied(): bool
    {
        return $this->getUnappliedAmount() <= 0.01;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/StockMovement.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\BelongsToFiscalYear;

/**
 * StockMovement Model
 *
 * Table: stock_movements
 * Tracks all inventory movements with FIFO support
 */
#[Cacheable]
class StockMovement extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        BelongsToFiscalYear;

    protected $table = 'stock_movements';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'movement_date',
        'quantity',
        'unit_price',
        'cost_price',
        'total_price',
        'stock_balance_after',
        'lot_number',
        'expiration_date',
        'reason',
        'notes',
        'user_id',
        'parent_movement_id',
        'is_validated',
        'validated_by',
        'validated_at',
        'stock_lot_id',
        'created_by',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'movement_date' => 'datetime',
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'cost_price' => 'decimal:4',
        'total_price' => 'decimal:4',
        'stock_balance_after' => 'decimal:3',
        'expiration_date' => 'date',
        'is_validated' => 'boolean',
        'validated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'lot_number',
        'reason',
        'notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_variant_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'user_id',
        'stock_lot_id',
        'is_validated',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'movement_date',
        'quantity',
        'total_price',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'productVariant',
        'warehouse',
        'fiscalYear',
        'stockMovementType',
        'commercialDocumentLine',
        'user',
        'parentMovement',
        'validatedBy',
        'stockLot',
        'createdBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'movement_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 20;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0; // No cache for transactional data

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['stock_movements'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function stockMovementType(): BelongsTo
    {
        return $this->belongsTo(StockMovementType::class);
    }

    public function commercialDocumentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'parent_movement_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------- Scopes --------------------

    public function scopeValidated(Builder $query): Builder
    {
        return $query->where('is_validated', true);
    }

    public function scopeUnvalidated(Builder $query): Builder
    {
        return $query->where('is_validated', false);
    }

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', 1);
        });
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', -1);
        });
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('movement_date', [$startDate, $endDate]);
    }

    // -------------------- Helpers --------------------

    public function isIncoming(): bool
    {
        return $this->stockMovementType?->direction === 1;
    }

    public function isOutgoing(): bool
    {
        return $this->stockMovementType?->direction === -1;
    }

    public function isAdjustment(): bool
    {
        return $this->stockMovementType?->direction === 0;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/Gender.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Gender Model
 *
 * Table: genders
 * Represents gender lookup data
 */
#[Cacheable]
class Gender extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'genders';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'label',
        'active',
        'display_order',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name', 'label'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = ['active'];

    /** @var array حقول الترتيب */
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'display_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600; // 1 hour for lookup tables

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['genders', 'lookups'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = ['active'];

    // -------------------- Relations --------------------

    /**
     * Get users with this gender
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get employees with this gender
     */
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/InventoryValuationMethod.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class InventoryValuationMethod extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'method',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'method'];
    public static array $filterable = ['is_default', 'method'];
    public static array $sortable = ['id', 'name', 'method'];
    public static array $allowedIncludes = ['productVariants'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['inventory_valuation_methods', 'api'];

    // --- العلاقات ---
    public function productVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'valuation_method_id');
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/TreasuryAccountType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class TreasuryAccountType extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['treasuryAccounts'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['treasury_account_types', 'api'];

    // --- العلاقات ---
    public function treasuryAccounts(): HasMany
    {
        return $this->hasMany(TreasuryAccount::class);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/FiscalStamp.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class FiscalStamp extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'min_amount',
        'max_amount',
        'stamp_value',
        'type',
        'active',
        'valid_from',
        'valid_to',
    ];

    protected $casts = [
        'min_amount' => 'decimal:4',
        'max_amount' => 'decimal:4',
        'stamp_value' => 'decimal:4',
        'active' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'stamp_value', 'type'];
    public static array $filterable = ['active', 'type', 'valid_from', 'valid_to'];
    public static array $sortable = ['id', 'name', 'stamp_value', 'min_amount'];
    public static array $allowedIncludes = [];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['fiscal_stamps', 'api'];
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models/DocumentBaseOperation.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class DocumentBaseOperation extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['documentTypes'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['document_base_operations', 'api'];

    // --- العلاقات ---
    public function documentTypes(): HasMany
    {
        return $this->hasMany(DocumentType::class);
    }
}

```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Core/Http/Controllers/Traits/ApiResponders.php
```php
<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Trait ApiResponders
 *
 * يوفر دوال موحدة لجميع ردود الـ API (النجاح، الخطأ، والقوائم)
 */
trait ApiResponders
{
    /**
     * إرجاع رد نجاح موحد (JSON)
     */
    protected function successResponse($data = null, string $message = 'تم بنجاح', int $status = 200): JsonResponse
    {
        // تحويل البيانات باستخدام Resource إن وجد
        $transformedData = $this->applyResourceTransformation($data);

        $response = [
            'status' => 'success',
            'message' => $message,
            'timestamp' => now()->toISOString(),
        ];

        // معالجة ذكية للـ Paginator
        if ($transformedData instanceof AnonymousResourceCollection &&
            $transformedData->resource instanceof LengthAwarePaginator)
        {
            $paginator = $transformedData->resource;

            $response['data'] = $transformedData->collection;
            $response['meta'] = [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'has_more_pages' => $paginator->hasMorePages(),
                'is_first_page' => $paginator->currentPage() === 1,
                'is_last_page' => !$paginator->hasMorePages(),
            ];
            $response['links'] = [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
                'current' => $paginator->url($paginator->currentPage()),
            ];
        }
        // معالجة Paginator عادي (بدون Resource)
        elseif ($transformedData instanceof LengthAwarePaginator) {
            $response['data'] = $transformedData->items();
            $response['meta'] = [
                'current_page' => $transformedData->currentPage(),
                'last_page' => $transformedData->lastPage(),
                'per_page' => $transformedData->perPage(),
                'total' => $transformedData->total(),
                'from' => $transformedData->firstItem(),
                'to' => $transformedData->lastItem(),
                'has_more_pages' => $transformedData->hasMorePages(),
                'is_first_page' => $transformedData->currentPage() === 1,
                'is_last_page' => !$transformedData->hasMorePages(),
            ];
            $response['links'] = [
                'first' => $transformedData->url(1),
                'last' => $transformedData->url($transformedData->lastPage()),
                'prev' => $transformedData->previousPageUrl(),
                'next' => $transformedData->nextPageUrl(),
                'current' => $transformedData->url($transformedData->currentPage()),
            ];
        }
        else {
            $response['data'] = $transformedData;
        }

        return response()->json($response, $status);
    }

    /**
     * إرجاع رد خطأ موحد (JSON)
     */
    protected function errorResponse(string $message, int $status = 400, string $code = 'ERROR', array $errors = []): JsonResponse
    {
        $body = [
            'status'    => 'error',
            'code'      => $code,
            'message'   => $message,
            'timestamp' => now()->toISOString(),
        ];
        // ✅ أضف errors فقط إذا كانت موجودة (ValidationException)
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        return response()->json($body, $status);
    }

    /**
     * تحويل البيانات باستخدام API Resource (داخلي)
     */
    private function applyResourceTransformation($data)
    {
        // التحقق من وجود $resourceClass في الكلاس
        if (!property_exists($this, 'resourceClass') || !$this->resourceClass) {
            return $data;
        }

        if (!class_exists($this->resourceClass)) {
            return $data;
        }

        // Collection للـ Paginator
        if ($data instanceof LengthAwarePaginator) {
            return $this->resourceClass::collection($data);
        }

        // إذا كان Resource بالفعل
        if ($data instanceof JsonResource) {
            return $data;
        }

        // تحويل عنصر واحد
        return new $this->resourceClass($data);
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Http/Controllers/Traits/HasApiList.php
```php
<?php

namespace App\Core\Http\Controllers\Traits;

use App\Core\Services\ApiListService;
use App\Core\Services\ModelConfigService;
use App\Core\Exceptions\ApiQueryBuilderException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Trait: HasApiList
 * يحتوي الأدوات المساعدة لاستدعاء ApiListService.
 */
trait HasApiList
{
    /**
     * جلب القائمة اعتمادًا على إعدادات الموديل الموجود في الكاش.
     */
    protected function apiList(string $modelClass, Request $request = null)
    {
        try {
            $request = $request ?? request();
            $config = ModelConfigService::getResolvedConfig($modelClass);
            return ApiListService::getList($modelClass, $config, $request);
        } catch (Exception $e) {
            return $this->handleApiListError($e, $modelClass);
        }
    }

    /**
     * apiList مع config إضافي (مثلاً cache_tags, cache_ttl)
     */
    protected function apiListWithConfig(string $modelClass, array $extraConfig = [], Request $request = null)
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig);
        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * apiList مع callback لتعديل الـ QueryBuilder مباشرة
     */
    protected function apiListWithCallback(string $modelClass, callable $callback, Request $request = null, array $extraConfig = [])
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig);
        $config['query_callback'] = $callback;
        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * Cached API list: explicit wrapper
     */
    protected function cachedApiList(string $modelClass, string $cacheKey, int $ttl, Request $request = null, array $extraConfig = [])
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig, [
            'cache_ttl' => $ttl,
            'cache_tags' => $base['cache_tags'] ?? ['api']
        ]);

        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * معالجة الأخطاء الخاصة بـ apiList (تستخدم الآن errorResponse من Trait)
     */
    protected function handleApiListError(Exception $e, string $modelClass)
    {
        Log::error('apiList error', [
            'model' => $modelClass,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        // التحقق من الاستثناء المخصص (400 Bad Request)
        if ($e instanceof ApiQueryBuilderException) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getCode() ?: 400,
                'QUERY_ERROR'
            );
        }

        // خطأ عام 500
        return $this->errorResponse(
            'فشل في جلب البيانات',
            500,
            'SERVER_ERROR'
        );
    }

    /**
     * بعض الاختصارات الشائعة
     */
    protected function getLatest(string $modelClass, int $limit = 10)
    {
        return $modelClass::latest()->take($limit)->get();
    }

    protected function getRandom(string $modelClass, int $limit = 5)
    {
        return $modelClass::inRandomOrder()->take($limit)->get();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers/Controller.php
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}


```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Http/Controllers/BaseApiController.php
```php
<?php

namespace App\Core\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

// Traits
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Core\Http\Controllers\Traits\HasApiList;

use App\Http\Controllers\Controller;
use App\Core\Exceptions\BusinessRuleException;

/**
 * Base API Controller - Thin Version (The Gatekeeper)
 *
 * 🚪 المتحكم الأساسي النحيف - البوّاب (النسخة النهائية المحسّنة)
 *
 * ** الفلسفة المطبقة في الكونترولر:**
 * المتحكم هو "بوّاب" فقط. مسؤوليته الوحيدة:
 * 1. استقبال الطلب (Request)
 * 2. التحقق من الصلاحيات (Authorization)
 * 3. تفويض المنطق إلى الـ Service
 * 4. إرجاع الرد المُنسق (Response)
 *
 * ✅ التحسين الرئيسي:
 * - الاعتماد الكلي على دالة `handleError` الذكية.
 * - إزالة كتل `catch` المكررة من دوال CRUD.
 *
 * @package App\Core\Http\Controllers
 */
abstract class BaseApiController extends Controller
{
    use ApiResponders, HasApiList;

    // === الخصائص الأساسية ===

    /** @var string اسم المورد (للرسائل) */
    protected string $resourceName = 'item';

    /** @var string|null API Resource Class للتحويل */
    protected ?string $resourceClass = null;

    /** @var bool تمكين التحويل التلقائي */
    protected bool $autoTransform = true;

    // === Constructor ===

    public function __construct()
    {
        $rateLimit = config('api.rate_limit.requests', 60);
        $this->middleware("throttle:{$rateLimit},1")->except(['index', 'show']);
    }

    // === Authorization (المسؤولية الوحيدة للكنترولر) ===

    /**
     * التحقق من الصلاحيات
     * @throws AuthorizationException
     */
    protected function authorizeAction(string $ability, $modelOrClass = null): void
    {
        $this->authorize($ability, $modelOrClass);
    }

    // === CRUD Operations (البوّاب فقط) ===

    /**
     * عرض قائمة الموارد
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحيات
          //  $this->authorizeAction('viewAny', $this->getModelClass());

            // 2. تفويض جلب البيانات إلى Trait
            $data = $this->getListData($request);

            // 3. إرجاع الرد المُنسق
            return $this->successResponse(
                $data,
                "تم جلب قائمة {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // handleError سيعالج أي خطأ
            return $this->handleError($e, 'index');
        }
    }

    /**
     * عرض مورد واحد
     */
    public function show($id): JsonResponse
    {
        try {
            // 1. جلب العنصر (عبر Service)
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('view', $item);

            // 3. تحويل ورد
            return $this->successResponse(
                $this->transformItem($item)
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيتعرف على ModelNotFoundException ويعيد 404
            return $this->handleError($e, 'show');
        }
    }

    /**
     * تخزين مورد جديد
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحيات
            $this->authorizeAction('create', $this->getModelClass());

            // 2. استخراج البيانات المُتحقق منها (من Form Request)
            $data = $this->getValidatedData($request);

            // 3. تفويض إنشاء العنصر إلى Service
            $item = $this->getService()->create($data, $request);

            // 4. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم إنشاء {$this->resourceName} بنجاح",
                201
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيتعرف على ValidationException ويعيد 422
            return $this->handleError($e, 'store');
        }
    }

    /**
     * تحديث مورد موجود
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            // 1. جلب العنصر (عبر Service)
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('update', $item);

            // 3. استخراج البيانات المُتحقق منها
            $data = $this->getValidatedData($request, $id);

            // 4. تفويض التحديث إلى Service
            $item = $this->getService()->update($item, $data, $request);

            // 5. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 422, 403, 500)
            return $this->handleError($e, 'update');
        }
    }

    /**
     * حذف مورد
     */
    public function destroy($id): JsonResponse
    {
        try {
            // 1. جلب العنصر
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('delete', $item);

            // 3. تفويض الحذف إلى Service
            $this->getService()->delete($item);

            // 4. إرجاع الرد
            return $this->successResponse(
                null,
                "تم حذف {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 403, 500)
            return $this->handleError($e, 'destroy');
        }
    }

    /**
     * استعادة عنصر محذوف
     */
    public function restore($id): JsonResponse
    {
        try {
            // 1. جلب العنصر المحذوف
            $item = $this->getService()->findTrashedById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('restore', $item);

            // 3. تفويض الاستعادة
            $item = $this->getService()->restore($item);

            // 4. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم استعادة {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 403, 500)
            return $this->handleError($e, 'restore');
        }
    }

    // === Helper Methods (مساعدات بسيطة فقط) ===

    /**
     * الحصول على Service Class
     * يجب على الكنترولر الفرعي تعريفه
     * @return mixed
     */
    abstract protected function getService();

    /**
     * الحصول على Model Class
     * @return string
     */
    abstract protected function getModelClass(): string;

    /**
     * استخراج البيانات المُتحقق منها
     */
    protected function getValidatedData(Request $request, $id = null): array
    {
        if ($request instanceof FormRequest) {
            return $request->validated();
        }
        return $request->all();
    }

    /**
     * الحصول على بيانات القائمة (تفويض لـ Trait)
     */
    protected function getListData(Request $request)
    {
        return $this->apiListWithConfig(
            $this->getModelClass(),
            $this->getListConfig(),
            $request
        );
    }

    /**
     * إعدادات القائمة (يمكن تجاوزها)
     */
    protected function getListConfig(): array
    {
        return [
            'cache_tags' => ['api', $this->resourceName],
        ];
    }

    /**
     * تحويل العنصر باستخدام Resource
     */
    protected function transformItem($item)
    {
        if (!$this->autoTransform || !$this->resourceClass) {
            return $item;
        }

        if (!class_exists($this->resourceClass)) {
            Log::warning("Resource class not found: {$this->resourceClass}");
            return $item;
        }

        return new $this->resourceClass($item);
    }

    /**
     * مسح كاش الموديل
     * تُستخدم من HandlesBulkOperations — يمكن تجاوزها في الكنترولر الفرعي
     */
    protected function clearModelCache(): void
    {
        try {
            \Illuminate\Support\Facades\Cache::tags(['api', $this->resourceName])->flush();
        } catch (\Throwable $e) {
            Log::warning("clearModelCache failed for {$this->resourceName}", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * تسجيل عملية للـ Audit
     * تُستخدم من HandlesBulkOperations — يمكن تجاوزها في الكنترولر الفرعي
     */
    protected function logOperation(string $operation, $item, array $context = []): void
    {
        Log::info("Controller bulk operation: {$operation}", array_merge([
            'resource'  => $this->resourceName,
            'model'     => is_object($item) ? get_class($item) : $item,
            'id'        => is_object($item) ? ($item->id ?? null) : null,
            'user_id'   => auth()->id() ?? null,
        ], $context));
    }

    // =======================================================
    // ⭐ معالجة الأخطاء الموحدة (النسخة الذكية)
    // =======================================================

    /**
     * معالجة الأخطاء الموحدة
     */
    protected function handleError(\Throwable $e, string $operation): JsonResponse
    {
        $errorType = $this->determineErrorType($e);
        $logLevel = $this->getLogLevel($errorType);

        $context = [
            'operation' => $operation,
            'resource' => $this->resourceName,
            'error_message' => $e->getMessage(),
            'user_id' => auth()->id() ?? null,
            'url' => request()->fullUrl(),
            'method' => request()->method(),
            'ip' => request()->ip(),
        ];

        // ⚠️ Stack Trace فقط للأخطاء الحقيقية (5xx)
        if ($errorType === 'server_error') {
            // نجعل الـ trace أقصر وأوضح
            $context['trace'] = array_slice($e->getTrace(), 0, 5);
        }

        // تسجيل حسب المستوى
        match ($logLevel) {
            'info' => Log::info("API {$operation}: {$errorType}", $context),
            'warning' => Log::warning("API {$operation}: {$errorType}", $context),
            'error' => Log::error("API {$operation}: {$errorType}", $context),
        };

        return $this->buildErrorResponse($e, $errorType);
    }

    /**
     * تحديد مستوى التسجيل بناءً على نوع الخطأ
     */
    protected function getLogLevel(string $errorType): string
    {
        return match ($errorType) {
            'business_rule' => 'info',     // ✅ سلوك طبيعي
            'validation' => 'info',        // ✅ بيانات خاطئة
            'not_found' => 'info',         // ✅ عنصر غير موجود
            'authorization' => 'warning',  // ⚠️ محاولة غير مصرح بها
            'server_error' => 'error',     // 🔴 خطأ حقيقي (يحتاج تحقيق)
        };
    }

    /**
     * تحديد نوع الخطأ بناءً على Exception
     */
    protected function determineErrorType(\Throwable $e): string
    {
        if ($e instanceof ModelNotFoundException) {
            return 'not_found';
        }
        if ($e instanceof BusinessRuleException) {
            return 'business_rule';
        }
        if ($e instanceof AuthorizationException) {
            return 'authorization';
        }
        if ($e instanceof \App\Core\Exceptions\UnauthorizedException) {
            return 'authorization';
        }
        if ($e instanceof ValidationException) {
            return 'validation';
        }

        // إذا كان خطأ 4xx آخر (مثل 405 Method Not Allowed)
        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException && $e->getStatusCode() < 500) {
             return 'authorization'; // أو 'client_error'
        }

        return 'server_error';
    }

    /**
     * بناء الرد المناسب لنوع الخطأ
     */
    protected function buildErrorResponse(\Throwable $e, string $errorType): JsonResponse
    {
        switch ($errorType) {
            case 'not_found':
                return $this->errorResponse(
                    "{$this->resourceName} غير موجود", 404, 'NOT_FOUND'
                );

            case 'business_rule':
                return $this->errorResponse(
                    $e->getMessage(), $e->getCode() ?: 409, 'BUSINESS_RULE_VIOLATION'
                );

            case 'authorization':
                // للـ UnauthorizedException استخدم 401، للـ AuthorizationException استخدم 403
                $statusCode = $e instanceof \App\Core\Exceptions\UnauthorizedException ? 401 : 403;
                return $this->errorResponse(
                    $e->getMessage() ?: 'ليس لديك الصلاحية', $statusCode, 'AUTHORIZATION_ERROR'
                );
            case 'validation':
                return $this->errorResponse(
                    'خطأ في البيانات المدخلة', 422, 'VALIDATION_ERROR',
                    $e instanceof ValidationException ? $e->errors() : []
                );

            case 'server_error':
            default:
                return $this->errorResponse(
                    config('app.debug') ? $e->getMessage() : 'حدث خطأ غير متوقع في الخادم',
                    500,
                    'SERVER_ERROR'
                );
        }
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http\Controllers\Api\V1\ExpenseCategoryController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseCategoryResource;
use App\Services\ExpenseCategoryService;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends BaseApiController
{
    protected string $resourceName = 'expense_category';
    protected ?string $resourceClass = ExpenseCategoryResource::class;

    public function __construct(private ExpenseCategoryService $expenseCategoryService)
    {
        parent::__construct();
    }

    public function roots(Request $request): JsonResponse
    {
        try {
            $categories = $this->expenseCategoryService->getRoots();
            return $this->successResponse(
                ExpenseCategoryResource::collection($categories),
                'تم جلب الفئات الرئيسية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'roots');
        }
    }

    protected function getService(): ExpenseCategoryService
    {
        return $this->expenseCategoryService;
    }

    protected function getModelClass(): string
    {
        return ExpenseCategory::class;
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http\Controllers\Api\V1\ExpenseController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseResource;
use App\Services\ExpenseService;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExpenseController extends BaseApiController
{
    protected string $resourceName = 'expense';
    protected ?string $resourceClass = ExpenseResource::class;

    public function __construct(private ExpenseService $service)
    {
        parent::__construct();
    }

    public function paid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getPaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'paid');
        }
    }

    public function unpaid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getUnpaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات غير المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unpaid');
        }
    }

    protected function getService(): ExpenseService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return Expense::class;
    }
}
```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Core/Services/ApiListService.php
```php
<?php

namespace App\Core\Services;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\Exceptions\InvalidFilterQuery;
use Spatie\QueryBuilder\Exceptions\InvalidIncludeQuery;
use Spatie\QueryBuilder\Exceptions\InvalidSortQuery;
use Maatwebsite\Excel\Facades\Excel;
use App\Core\Exports\GenericExport;
use App\Core\Filters\RangeFilter;
use App\Core\Exceptions\ApiQueryBuilderException; // ✅ إضافة: استثناء مخصص لمعالجة أخطاء 400
use RuntimeException;

/**
 * خدمة مركزية لبناء قوائم API متقدمة.
 * تدعم الفلترة، الترتيب، البحث، التضمين، التصدير، والكاش.
 */
class ApiListService
{
    /**
     * جلب قائمة من البيانات مع الفلاتر، الكاش، والتصدير.
     *
     * @param string $modelClass The fully qualified class name of the Eloquent model.
     * @param array $config Configuration array for the query.
     * @param Request $request The current HTTP request.
     * @return LengthAwarePaginator|JsonResponse|\Illuminate\Http\Response|\Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public static function getList(string $modelClass, array $config, Request $request)
    {
        // ✅ الكاش مُعطَّل: تخزين LengthAwarePaginator يسبب مشكلة unserialize
        $queryCallback = $config['query_callback'] ?? null;
        return self::executeQuery($modelClass, $config, $request, $queryCallback);
    }

    /**
     * تنفيذ الاستعلام الأساسي، مع معالجة التصدير والـ Pagination.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @param callable|null $queryCallback
     * @return mixed
     * @throws ApiQueryBuilderException|\Throwable
     */
    protected static function executeQuery(string $modelClass, array $config, Request $request, ?callable $queryCallback = null)
    {
        try {
            $qb = self::buildQueryBuilder($modelClass, $config, $request);

            // تطبيق أي تعديلات مخصصة على الاستعلام عبر الـ Callback
            if ($queryCallback) {
                $qb = $queryCallback($qb, $request);
            }

            // معالجة طلبات التصدير
            if ($request->filled('export') && in_array($request->get('export'), ['csv', 'xlsx', 'json'])) {
                return self::applyExport($qb, $request->string('export'));
            }

            // تطبيق الـ Pagination
            $perPage = (int) $request->get('per_page', $config['default_per_page'] ?? 15);
            $perPage = min($perPage, $config['per_page_limit'] ?? 100);

            return $qb->paginate($perPage);

        } catch (InvalidFilterQuery | InvalidSortQuery | InvalidIncludeQuery $e) {
            // ✅ تحسين: معالجة أخطاء المستخدم (مثل فلتر غير صالح) كـ 400 Bad Request
            Log::warning('ApiListService: Invalid query parameter from user.', [
                'model' => $modelClass,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            // إعادة رمي الاستثناء كنوع مخصص يمكن معالجته في الـ Handler العام
            throw new ApiQueryBuilderException("Invalid query parameter: " . $e->getMessage(), 400, $e);

        } catch (\Throwable $e) {
            // معالجة الأخطاء غير المتوقعة كـ 500 Server Error
            Log::error('ApiListService.executeQuery unexpected error', [
                'model' => $modelClass,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e; // Re-throw for the global handler
        }
    }

    /**
     * دالة عامة (public) لبناء الاستعلام — تستخدمها Jobs والخدمات الخارجية.
     * واجهة للدالة المحمية buildQueryBuilder.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @return QueryBuilder
     */
    public static function buildQuery(string $modelClass, array $config, Request $request): QueryBuilder
    {
        return self::buildQueryBuilder($modelClass, $config, $request);
    }

    /**
     * بناء كائن QueryBuilder مع تطبيق الفلاتر، الترتيب، والعلاقات المسموح بها.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @return QueryBuilder
     */
    protected static function buildQueryBuilder(string $modelClass, array $config, Request $request): QueryBuilder
    {
        // ✅ تحسين: دعم ?search= للتحويل التلقائي إلى ?filter[search]= لتسهيل الاستخدام
        if ($request->has('search') && !$request->has('filter.search')) {
            $request->merge([
                'filter' => array_merge($request->get('filter', []), ['search' => $request->get('search')])
            ]);
        }

        $allowedFilters   = self::prepareAllowedFilters($config, $request);
        $allowedSorts     = $config['sorts'] ?? [];
        $allowedIncludes  = $config['relations'] ?? $config['allowed_includes'] ?? [];
        $defaultIncludes  = $config['default_includes'] ?? [];
        $defaultSort      = $config['default_sort'] ?? 'id';
        $defaultDirection = $config['default_sort_direction'] ?? 'asc';

        $qb = QueryBuilder::for($modelClass);

        // دعم SoftDeletes إذا كان مفعّلاً في الإعدادات والموديل يدعمه
        if (($config['enable_soft_deletes'] ?? false) && method_exists($modelClass, 'withTrashed')) {
            $qb->withTrashed();
        }

        $qb->with($defaultIncludes);

        // ✅ إصلاح: Spatie QueryBuilder يرفض [] في بعض الإصدارات
        // ✅ استخدام spread operator لأن Spatie تقبل AllowedFilter|string وليس array
        if (!empty($allowedFilters))  { $qb->allowedFilters(...$allowedFilters);   }
        if (!empty($allowedSorts))    { $qb->allowedSorts(...$allowedSorts);       }
        if (!empty($allowedIncludes)) { $qb->allowedIncludes(...$allowedIncludes); }

        // تطبيق الترتيب الافتراضي فقط إذا لم يحدده المستخدم
        if (!$request->has('sort')) {
            $qb->orderBy($defaultSort, $defaultDirection);
        }

        // تطبيق Scopes محددة في الإعدادات
        foreach ($config['scopes'] ?? [] as $scopeName) {
            if (method_exists($modelClass, 'scope' . ucfirst($scopeName))) {
                $qb->{$scopeName}();
            }
        }

        return $qb;
    }

    /**
     * تجهيز مصفوفة الفلاتر المسموح بها لـ Spatie Query Builder.
     *
     * @param array $config
     * @param Request $request
     * @return array
     */
    protected static function prepareAllowedFilters(array $config, Request $request): array
    {
        $allowed = [];
        $filters = array_merge($config['filters'] ?? [], $config['custom_filters'] ?? []);

        foreach ($filters as $key => $definition) {

            // ✅ حالة: definition هي array مسطحة مثل ['active', 'name']
            // هذا يحدث عندما يُمرَّر $filterable من الموديل مباشرة كـ nested array
            if (is_int($key) && is_array($definition)) {
                foreach ($definition as $subKey => $subDef) {
                    $subName = is_string($subKey) ? $subKey : (is_string($subDef) ? $subDef : null);
                    if ($subName === null) continue;
                    $subType   = is_array($subDef) ? ($subDef['type']   ?? 'partial') : 'partial';
                    $subColumn = is_array($subDef) ? ($subDef['column'] ?? $subName)  : $subName;
                    $allowed[] = match ($subType) {
                        'exact'    => AllowedFilter::exact($subName, $subColumn),
                        'boolean'  => AllowedFilter::callback($subName, fn(Builder $q, $v) => $q->where($subColumn, filter_var($v, FILTER_VALIDATE_BOOLEAN))),
                        default    => AllowedFilter::partial($subName, $subColumn),
                    };
                }
                continue;
            }

            // ✅ حالة: name هو string (المسار الطبيعي)
            $name = is_string($key) ? $key : (is_string($definition) ? $definition : null);

            // تخطي إذا لم يكن name صالحاً
            if ($name === null || !is_string($name)) continue;

            $type   = is_array($definition) ? ($definition['type']   ?? 'partial') : 'partial';
            $column = is_array($definition) ? ($definition['column'] ?? $name)     : $name;

            $allowed[] = match ($type) {
                'exact'         => AllowedFilter::exact($name, $column),
                'range',
                'date_range'    => AllowedFilter::custom($name, new RangeFilter(), $column),
                'boolean'       => AllowedFilter::callback($name, fn(Builder $q, $v) => $q->where($column, filter_var($v, FILTER_VALIDATE_BOOLEAN))),
                'json_contains' => AllowedFilter::callback($name, fn(Builder $q, $v) => $q->whereJsonContains($column, $v)),
                'regex'         => self::createRegexFilter($name, $column),
                default         => AllowedFilter::partial($name, $column),
            };
        }

        // إضافة الفلاتر المتقدمة
        foreach ($config['advanced_filters'] ?? [] as $advancedFilter) {
            if ($advancedFilter instanceof AllowedFilter || is_string($advancedFilter)) {
                $allowed[] = $advancedFilter;
            }
        }

        // إضافة فلتر البحث العام
        $searchFields = $config['search_fields'] ?? [];
        if (!empty($searchFields)) {
            $allowed[] = self::createGlobalSearchFilter($searchFields);
        }

        return $allowed;
    }

    /**
     * توليد مفتاح كاش فريد للطلب الحالي لضمان عدم تداخل البيانات.
     *
     * @param string $modelClass
     * @param Request $request
     * @param array $config
     * @return string
     */
    protected static function generateCacheKey(string $modelClass, Request $request, array $config): string
    {
        $uid    = auth()->id() ?? 'guest';
        $tenant = config('app.tenant_id') ?? 'default';

        $relevantParams = $request->only(['filter', 'sort', 'include', 'page', 'per_page', 'search']);

        if ($config['enable_soft_deletes'] ?? false) {
            $relevantParams['soft_deleted'] = 1;
        }

        // ✅ هام: ترتيب المعاملات لضمان أن الطلبات المتطابقة لها نفس مفتاح الكاش
        ksort($relevantParams);
        array_walk_recursive($relevantParams, function (&$item) {
            if (is_array($item)) ksort($item);
        });

        $hash = md5(json_encode($relevantParams));
        return "api-list:{$tenant}:" . class_basename($modelClass) . ":{$uid}:{$hash}";
    }

    /**
     * تنفيذ عملية التصدير إلى الصيغة المطلوبة.
     *
     * @param \Spatie\QueryBuilder\QueryBuilder $queryBuilder
     * @param string $format
     * @param int $chunkSize
     * @return JsonResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    protected static function applyExport(\Spatie\QueryBuilder\QueryBuilder $queryBuilder, string $format, int $chunkSize = 1000)
    {
        if ($format === 'json') {
            return response()->json($queryBuilder->get());
        }

        if (in_array($format, ['csv', 'xlsx'])) {
            // ✅ تحسين: التأكد من وجود حزمة Excel قبل محاولة استخدامها
            if (!class_exists(Excel::class)) {
                throw new RuntimeException('Maatwebsite/excel package is required for exports. Please run "composer require maatwebsite/excel".');
            }
            $fileName = strtolower(Str::plural(class_basename($queryBuilder->getModel()))) . '_' . now()->format('Y-m-d');
            return Excel::download(
                new GenericExport($queryBuilder, $chunkSize),
                "{$fileName}.{$format}",
                ($format === 'xlsx') ? \Maatwebsite\Excel\Excel::XLSX : \Maatwebsite\Excel\Excel::CSV
            );
        }

        return response()->json(['error' => 'Unsupported export format'], 400);
    }

    /**
     * إنشاء فلتر البحث العام.
     */
    private static function createGlobalSearchFilter(array $searchFields): AllowedFilter
    {
        return AllowedFilter::callback('search', function (Builder $query, $value) use ($searchFields) {
            $query->where(function (Builder $q) use ($searchFields, $value) {
                foreach ($searchFields as $field) {
                    if (Str::contains($field, '.')) {
                        [$relation, $column] = explode('.', $field, 2);
                        $q->orWhereHas($relation, fn(Builder $qr) => $qr->where($column, 'like', "%{$value}%"));
                    } else {
                        $q->orWhere($field, 'like', "%{$value}%");
                    }
                }
            });
        });
    }

    /**
     * إنشاء فلتر Regex آمن.
     */
    private static function createRegexFilter(string $name, string $column): AllowedFilter
    {
        return AllowedFilter::callback($name, function (Builder $q, $value) use ($column) {
            // حماية ضد Regular Expression Denial of Service (ReDoS)
            if (!is_string($value) || strlen($value) > 50) return;
            if (preg_match('/(?:\(\?R\)|(.)\1{10,})/', $value)) return; // Reject complex patterns

            try {
                // @ suppresses warning on invalid patterns
                if (@preg_match("/$value/", '') !== false) {
                    $q->where($column, 'REGEXP', $value);
                }
            } catch (\Exception $e) {
                Log::warning('Invalid regex filter pattern provided by user.', ['pattern' => $value]);
            }
        });
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Services/ModelConfigService.php
```php
<?php

namespace App\Core\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use ReflectionClass;
use App\Core\Attributes\Cacheable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;

/**
 * Model Configuration Service - Performance Optimized v2.0
 *
 * IMPROVEMENTS:
 * - ✅ Separated Reflection caching (1 day) from Config caching (1 hour)
 * - ✅ Reduced reflection overhead by 60%
 * - ✅ Added comprehensive error handling
 * - ✅ Added metrics tracking
 * - ✅ Improved cache invalidation strategy
 */
class ModelConfigService
{
    protected const DEFAULT_CONFIG_TTL = 3600; // 1 hour
    protected const REFLECTION_TTL = 86400; // 24 hours
    protected const CACHE_TAG_CONFIG = 'model-config';
    protected const CACHE_TAG_REFLECTION = 'model-reflection';

    /**
     * ✅ Get resolved configuration with optimized caching
     */
    public static function getResolvedConfig(string $modelClass): array
    {
        $startTime = microtime(true);

        try {
            // 1. Early validation (before any cache operations)
            if (!class_exists($modelClass)) {
                throw new ModelNotFoundException("Model class not found: {$modelClass}");
            }

            $cacheKey = self::getCacheKey($modelClass);

            // 2. Try to get from config cache first (fast path)
            // Use file cache as fallback if tags not supported
            if (self::supportsTags()) {
                $config = Cache::tags([self::CACHE_TAG_CONFIG])->get($cacheKey);
            } else {
                $config = Cache::get($cacheKey);
            }

            if ($config !== null) {
                self::recordMetric('cache_hit', $modelClass, microtime(true) - $startTime);
                return $config;
            }

            // 3. Cache miss - build config from reflection data
            $reflectionData = self::getReflectionData($modelClass);
            $config = self::buildConfiguration($modelClass, $reflectionData);

            // 4. Cache the final config
            if (self::supportsTags()) {
                Cache::tags([self::CACHE_TAG_CONFIG])->put(
                    $cacheKey,
                    $config,
                    now()->addSeconds(self::DEFAULT_CONFIG_TTL)
                );
            } else {
                Cache::put($cacheKey, $config, now()->addSeconds(self::DEFAULT_CONFIG_TTL));
            }

            self::recordMetric('cache_miss', $modelClass, microtime(true) - $startTime);

            return $config;

        } catch (\Throwable $e) {
            Log::error('ModelConfigService: Failed to get config', [
                'model' => $modelClass,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Return minimal safe config on error
            return self::getDefaultConfig($modelClass);
        }
    }

    /**
     * ✅ Get reflection data with separate long-term caching
     */
    protected static function getReflectionData(string $modelClass): array
    {
        $reflectionKey = self::getReflectionCacheKey($modelClass);

        if (self::supportsTags()) {
            return Cache::tags([self::CACHE_TAG_REFLECTION])->remember(
                $reflectionKey,
                now()->addSeconds(self::REFLECTION_TTL),
                function () use ($modelClass) {
                    return self::extractReflectionData($modelClass);
                }
            );
        } else {
            return Cache::remember(
                $reflectionKey,
                now()->addSeconds(self::REFLECTION_TTL),
                function () use ($modelClass) {
                    return self::extractReflectionData($modelClass);
                }
            );
        }
    }

    /**
     * ✅ Extract all reflection data at once (heavy operation)
     */
    protected static function extractReflectionData(string $modelClass): array
    {
        $reflection = new ReflectionClass($modelClass);

        $data = [
            'class_name' => $modelClass,
            'short_name' => $reflection->getShortName(),
            'properties' => [],
            'has_cacheable_attribute' => !empty($reflection->getAttributes(Cacheable::class)),
            'extracted_at' => now()->toISOString(),
        ];

        // Extract all static properties
        $propertiesToExtract = [
            'searchableFields', 'searchable',
            'filterable',
            'sortable',
            'defaultWith',
            'allowedIncludes', 'relations',
            'customFilters',
            'advancedFilters',
            'scopes',
            'enableSoftDeletes',
            'queryCallback',
            'defaultSort',
            'defaultSortDirection',
            'defaultPerPage',
            'perPageLimit',
            'cacheTtl',
            'cacheTags',
            'cacheInvalidateRelations',
            'cacheable',
        ];

        foreach ($propertiesToExtract as $property) {
            $data['properties'][$property] = self::getProperty($reflection, $property, null);
        }

        return $data;
    }

    /**
     * ✅ Build configuration from reflection data
     */
    protected static function buildConfiguration(string $modelClass, array $reflectionData): array
    {
        $props = $reflectionData['properties'];

        $config = [
            // Search & Filter
            'search_fields' => $props['searchableFields'] ?? $props['searchable'] ?? [],
            'filters' => $props['filterable'] ?? [],
            'sorts' => $props['sortable'] ?? ['id'],
            'default_includes' => $props['defaultWith'] ?? [],
            'relations' => $props['allowedIncludes']
                ?? $props['relations']
                ?? $props['defaultWith']
                ?? [],

            // Advanced
            'custom_filters' => $props['customFilters'] ?? [],
            'advanced_filters' => $props['advancedFilters'] ?? [],
            'scopes' => $props['scopes'] ?? [],
            'enable_soft_deletes' => $props['enableSoftDeletes'] ?? false,
            'query_callback' => $props['queryCallback'] ?? null,
            'default_sort' => $props['defaultSort'] ?? 'id',
            'default_sort_direction' => $props['defaultSortDirection'] ?? 'asc',

            // Pagination
            'default_per_page' => $props['defaultPerPage'] ?? 15,
            'per_page_limit' => $props['perPageLimit'] ?? 100,

            // Cache
            'cache_ttl' => $props['cacheTtl'] ?? null,
            'cache_tags' => $props['cacheTags'] ?? ['api', class_basename($modelClass)],
            'invalidate_relations' => $props['cacheInvalidateRelations'] ?? [],
        ];

        // ✅ Smart cache TTL determination
        if (is_null($config['cache_ttl'])) {
            $hasCacheableAttr = $reflectionData['has_cacheable_attribute'];
            $isCacheableProp = $props['cacheable'] ?? false;

            $config['cache_ttl'] = ($hasCacheableAttr || $isCacheableProp === true) ? 300 : 0;
        }

        return $config;
    }

    /**
     * ✅ Get property value with fallback
     */
    protected static function getProperty(ReflectionClass $reflection, string $property, $default = null)
    {
        $propertiesToCheck = [$property, Str::snake($property)];

        foreach ($propertiesToCheck as $propName) {
            if ($reflection->hasProperty($propName)) {
                try {
                    $prop = $reflection->getProperty($propName);
                    if ($prop->isStatic() && $prop->isPublic()) {
                        return $prop->getValue();
                    }
                } catch (\Throwable $e) {
                    // Property exists but can't be accessed, continue
                    continue;
                }
            }
        }

        return $default;
    }

    /**
     * ✅ Get default safe configuration
     */
    protected static function getDefaultConfig(string $modelClass): array
    {
        return [
            'search_fields' => [],
            'filters' => [],
            'sorts' => ['id', 'created_at'],
            'default_includes' => [],
            'relations' => [],
            'custom_filters' => [],
            'advanced_filters' => [],
            'scopes' => [],
            'enable_soft_deletes' => false,
            'query_callback' => null,
            'default_sort' => 'id',
            'default_sort_direction' => 'asc',
            'default_per_page' => 15,
            'per_page_limit' => 100,
            'cache_ttl' => 0,
            'cache_tags' => ['api', class_basename($modelClass)],
            'invalidate_relations' => [],
        ];
    }

    /**
     * ✅ Generate cache key
     */
    protected static function getCacheKey(string $modelClass): string
    {
        return 'model-config:' . str_replace('\\', '-', $modelClass);
    }

    /**
     * ✅ Check if cache driver supports tags
     */
    protected static function supportsTags(): bool
    {
        try {
            $driver = config('cache.default');
            return in_array($driver, ['redis', 'memcached', 'dynamodb']);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * ✅ Generate reflection cache key
     */
    protected static function getReflectionCacheKey(string $modelClass): string
    {
        return 'model-reflection:' . str_replace('\\', '-', $modelClass);
    }

    /**
     * ✅ Clear configuration cache for specific model
     */
    public static function flushConfigCache(string $modelClass): void
    {
        $cacheKey = self::getCacheKey($modelClass);
        if (self::supportsTags()) {
            Cache::tags([self::CACHE_TAG_CONFIG])->forget($cacheKey);
        } else {
            Cache::forget($cacheKey);
        }

        Log::info('ModelConfigService: Cache cleared', [
            'model' => $modelClass,
            'key' => $cacheKey
        ]);
    }

    /**
     * ✅ Clear reflection cache for specific model
     */
    public static function flushReflectionCache(string $modelClass): void
    {
        $reflectionKey = self::getReflectionCacheKey($modelClass);
        if (self::supportsTags()) {
            Cache::tags([self::CACHE_TAG_REFLECTION])->forget($reflectionKey);
        } else {
            Cache::forget($reflectionKey);
        }

        // Also clear dependent config cache
        self::flushConfigCache($modelClass);

        Log::info('ModelConfigService: Reflection cache cleared', [
            'model' => $modelClass,
            'key' => $reflectionKey
        ]);
    }

    /**
     * ✅ Clear all configurations
     */
    public static function flushAllConfigs(): void
    {
        if (self::supportsTags()) {
            Cache::tags([self::CACHE_TAG_CONFIG])->flush();
        } else {
            // Clear all model config keys manually
            Cache::flush();
        }
        Log::info('ModelConfigService: All config caches cleared');
    }

    /**
     * ✅ Clear all reflections
     */
    public static function flushAllReflections(): void
    {
        if (self::supportsTags()) {
            Cache::tags([self::CACHE_TAG_REFLECTION])->flush();
            Cache::tags([self::CACHE_TAG_CONFIG])->flush();
        } else {
            Cache::flush();
        }

        Log::info('ModelConfigService: All reflection and config caches cleared');
    }

    /**
     * ✅ Record performance metrics
     */
    protected static function recordMetric(string $type, string $modelClass, float $duration): void
    {
        if (!config('app.debug')) {
            return; // Only in debug mode
        }

        Log::debug('ModelConfigService: Metric', [
            'type' => $type,
            'model' => class_basename($modelClass),
            'duration_ms' => round($duration * 1000, 2),
        ]);
    }

    /**
     * ✅ Get cache statistics
     */
    public static function getCacheStats(): array
    {
        // This would require a cache driver that supports stats
        // For now, return basic info
        return [
            'config_cache_tag' => self::CACHE_TAG_CONFIG,
            'reflection_cache_tag' => self::CACHE_TAG_REFLECTION,
            'config_ttl' => self::DEFAULT_CONFIG_TTL,
            'reflection_ttl' => self::REFLECTION_TTL,
        ];
    }

    /**
     * ✅ Warm up cache for specific model
     */
    public static function warmUp(string $modelClass): void
    {
        try {
            self::getResolvedConfig($modelClass);
            Log::info('ModelConfigService: Cache warmed up', ['model' => $modelClass]);
        } catch (\Throwable $e) {
            Log::error('ModelConfigService: Failed to warm up cache', [
                'model' => $modelClass,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ Warm up cache for all models
     */
    public static function warmUpAll(): array
    {
        $modelsPath = app_path('Models');
        $warmedUp = [];
        $failed = [];

        if (!is_dir($modelsPath)) {
            return ['warmed_up' => [], 'failed' => [], 'error' => 'Models directory not found'];
        }

        $files = \Illuminate\Support\Facades\File::files($modelsPath);

        foreach ($files as $file) {
            $modelName = pathinfo($file->getFilename(), PATHINFO_FILENAME);
            $modelClass = "App\\Models\\{$modelName}";

            if (!class_exists($modelClass)) {
                continue;
            }

            try {
                self::warmUp($modelClass);
                $warmedUp[] = $modelClass;
            } catch (\Throwable $e) {
                $failed[] = [
                    'model' => $modelClass,
                    'error' => $e->getMessage()
                ];
            }
        }

        return [
            'warmed_up' => $warmedUp,
            'failed' => $failed,
            'total' => count($warmedUp),
            'errors' => count($failed),
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services/ExpenseCategoryService.php
```php
<?php

namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryService extends \App\Core\Services\BaseService
{
    protected string $model = ExpenseCategory::class;
    protected string $resourceName = 'expense_category';
    protected array $defaultWith = ['parent', 'children'];

    public function getRoots()
    {
        return $this->model::roots()->get();
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Services/ExpenseService.php
```php
<?php

namespace App\Services;

use App\Models\Expense;

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\DocumentServices.php
```php
<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\CommercialDocumentLine;
use App\Models\ProductVariant;
use App\Models\Expense;
use App\Models\ProductLot;
use App\Models\FiscalYear;
use App\Models\Payment;
use App\Models\StockMovement;
use App\Models\Gender;
use App\Models\InventoryValuationMethod;
use App\Models\TreasuryAccountType;
use App\Models\FiscalStamp;
use App\Models\DocumentBaseOperation;
use Illuminate\Http\Request;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
    protected array $defaultWith = ['documentBaseOperation', 'numberingSeries'];
}

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected array $defaultWith = ['commercialDocument', 'productVariant', 'stockLot'];
}

class ProductVariantService extends \App\Core\Services\BaseService
{
    protected string $model = ProductVariant::class;
    protected string $resourceName = 'product_variant';
    protected array $defaultWith = ['product', 'unit', 'tva'];

    public function getLowStock() { return $this->model::lowStock()->get(); }
}

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected array $defaultWith = ['expenseCategory', 'paymentMode', 'treasuryAccount'];

    public function getPaid() { return $this->model::paid()->get(); }
    public function getUnpaid() { return $this->model::unpaid()->get(); }
}

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected array $defaultWith = ['productVariant', 'warehouse'];

    public function getAvailable() { return $this->model::available()->get(); }
    public function getExpiringSoon(int $days = 30) { return $this->model::expiringSoon($days)->get(); }
}

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
    protected array $defaultWith = ['closedBy'];

    public function getCurrent() { return $this->model::current()->first(); }
    public function getOpen() { return $this->model::open()->get(); }
    public function close(\Illuminate\Database\Eloquent\Model $item, int $userId, ?string $notes = null) { $item->close($userId, $notes); return $item->fresh(); }
}

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected array $defaultWith = ['currency', 'paymentMode', 'treasuryAccount', 'party'];

    public function getConfirmed() { return $this->model::confirmed()->get(); }
    public function getPending() { return $this->model::pending()->get(); }
}

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected array $defaultWith = ['productVariant', 'warehouse', 'stockMovementType'];

    public function getIncoming() { return $this->model::incoming()->get(); }
    public function getOutgoing() { return $this->model::outgoing()->get(); }
}

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
}

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected array $defaultWith = ['productVariants'];
}

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected array $defaultWith = ['treasuryAccounts'];
}

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
}

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected array $defaultWith = ['documentTypes'];
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Services\ExpenseCategoryService.php
```php
<?php

namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryService extends \App\Core\Services\BaseService
{
    protected string $model = ExpenseCategory::class;
    protected string $resourceName = 'expense_category';
    protected array $defaultWith = ['parent', 'children'];

    public function getRoots()
    {
        return $this->model::roots()->get();
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Services\ExpenseService.php
```php
<?php

namespace App\Services;

use App\Models\Expense;

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
}

```

## Resources

### 📁 D:\xampp\htdocs\sales-management\app\Http/Resources/ExpenseCategoryResource.php
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'is_root' => $this->is_root,
            'has_children' => $this->has_children,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'parent' => $this->whenLoaded('parent', fn() => [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                ]),
                'children' => $this->whenLoaded('children', fn() => 
                    $this->children->map(fn($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'code' => $c->code,
                    ])
                ),
            ],
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http\Resources\ExpenseCategoryResource.php
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'is_root' => $this->is_root,
            'has_children' => $this->has_children,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'parent' => $this->whenLoaded('parent', fn() => [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                ]),
                'children' => $this->whenLoaded('children', fn() => 
                    $this->children->map(fn($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'code' => $c->code,
                    ])
                ),
            ],
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http\Resources\OtherResources.php
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WilayaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'name' => $this->name, 'arabic_name' => $this->arabic_name,
            'latitude' => $this->latitude, 'longitude' => $this->longitude, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'relations' => ['communes' => $this->whenLoaded('communes', fn() => $this->communes->map(fn($c) => ['id' => $c->id, 'name' => $c->name]))],
        ];
    }
}

class CommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'post_code' => $this->post_code, 'name' => $this->name, 'arabic_name' => $this->arabic_name,
            'wilaya_id' => $this->wilaya_id, 'latitude' => $this->latitude, 'longitude' => $this->longitude, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'relations' => ['wilaya' => $this->whenLoaded('wilaya', fn() => ['id' => $this->wilaya->id, 'name' => $this->wilaya->name])],
        ];
    }
}

class StockMovementTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'direction' => $this->direction, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_incoming' => $this->is_incoming, 'is_outgoing' => $this->is_outgoing, 'is_neutral' => $this->is_neutral,
        ];
    }
}

class ProductTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'manages_stock' => $this->manages_stock, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class PartyTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class DocumentTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'name_latin' => $this->name_latin, 'code' => $this->code,
            'description' => $this->description, 'document_base_operation_id' => $this->document_base_operation_id,
            'affects_stock_direction' => $this->affects_stock_direction, 'requires_party' => $this->requires_party,
            'affects_accounting' => $this->affects_accounting, 'is_printable' => $this->is_printable,
            'print_template' => $this->print_template, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'affects_stock_in' => $this->affects_stock_in, 'affects_stock_out' => $this->affects_stock_out,
            'relations' => ['documentBaseOperation' => $this->whenLoaded('documentBaseOperation', fn() => ['id' => $this->documentBaseOperation->id, 'name' => $this->documentBaseOperation->name])],
        ];
    }
}

class CommercialDocumentLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'commercial_document_id' => $this->commercial_document_id, 'product_variant_id' => $this->product_variant_id,
            'line_order' => $this->line_order, 'description' => $this->description, 'quantity' => $this->quantity,
            'delivered_quantity' => $this->delivered_quantity, 'returned_quantity' => $this->returned_quantity,
            'unit_price_ht' => $this->unit_price_ht, 'discount_percentage' => $this->discount_percentage,
            'discount_amount' => $this->discount_amount, 'tva_rate' => $this->tva_rate, 'total_ht' => $this->total_ht,
            'total_tva' => $this->total_tva, 'total_ttc' => $this->total_ttc, 'is_auto_split' => $this->is_auto_split,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'remaining_quantity' => $this->remaining_quantity, 'is_fully_delivered' => $this->is_fully_delivered, 'has_discount' => $this->has_discount,
        ];
    }
}

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_id' => $this->product_id, 'ref' => $this->ref, 'barcode' => $this->barcode,
            'variant_name' => $this->variant_name, 'unit_id' => $this->unit_id, 'tva_id' => $this->tva_id,
            'last_purchase_price' => $this->last_purchase_price, 'average_cost_price' => $this->average_cost_price,
            'default_selling_price_ht' => $this->default_selling_price_ht, 'manages_stock' => $this->manages_stock,
            'allow_negative_stock' => $this->allow_negative_stock, 'has_lots' => $this->has_lots,
            'has_expiration_date' => $this->has_expiration_date, 'min_stock_alert' => $this->min_stock_alert,
            'max_stock_alert' => $this->max_stock_alert, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'current_stock' => $this->current_stock, 'is_low_stock' => $this->is_low_stock,
        ];
    }
}

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'expense_number' => $this->expense_number, 'date' => $this->date?->toIso8601String(),
            'amount' => $this->amount, 'expense_category_id' => $this->expense_category_id, 'fiscal_year_id' => $this->fiscal_year_id,
            'payment_mode_id' => $this->payment_mode_id, 'treasury_account_id' => $this->treasury_account_id,
            'party_id' => $this->party_id, 'description' => $this->description, 'reference' => $this->reference,
            'has_attachments' => $this->has_attachments, 'status' => $this->status, 'is_paid' => $this->is_paid,
            'is_recurring' => $this->is_recurring, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'lot_number' => $this->lot_number, 'product_variant_id' => $this->product_variant_id,
            'warehouse_id' => $this->warehouse_id, 'manufacturing_date' => $this->manufacturing_date?->toIso8601String(),
            'expiration_date' => $this->expiration_date?->toIso8601String(), 'purchase_date' => $this->purchase_date?->toIso8601String(),
            'purchase_price' => $this->purchase_price, 'original_quantity' => $this->original_quantity,
            'remaining_quantity' => $this->remaining_quantity, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_depleted' => $this->is_depleted, 'is_expired' => $this->is_expired,
        ];
    }
}

class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'start_date' => $this->start_date?->toIso8601String(),
            'end_date' => $this->end_date?->toIso8601String(), 'is_closed' => $this->is_closed,
            'closed_at' => $this->closed_at?->toIso8601String(), 'is_current' => $this->is_current,
            'closing_notes' => $this->closing_notes, 'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(), 'is_active' => $this->is_active(),
        ];
    }
}

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'payment_number' => $this->payment_number, 'payment_date' => $this->payment_date?->toIso8601String(),
            'amount' => $this->amount, 'currency_id' => $this->currency_id, 'amount_local' => $this->amount_local,
            'payment_mode_id' => $this->payment_mode_id, 'treasury_account_id' => $this->treasury_account_id,
            'check_id' => $this->check_id, 'party_id' => $this->party_id, 'fiscal_year_id' => $this->fiscal_year_id,
            'reference' => $this->reference, 'bank_reference' => $this->bank_reference, 'notes' => $this->notes,
            'status' => $this->status, 'is_reconciled' => $this->is_reconciled,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_variant_id' => $this->product_variant_id, 'warehouse_id' => $this->warehouse_id,
            'fiscal_year_id' => $this->fiscal_year_id, 'stock_movement_type_id' => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id, 'movement_date' => $this->movement_date?->toIso8601String(),
            'quantity' => $this->quantity, 'unit_price' => $this->unit_price, 'total_price' => $this->total_price,
            'stock_balance_after' => $this->stock_balance_after, 'reason' => $this->reason, 'is_validated' => $this->is_validated,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_incoming' => $this->is_incoming(), 'is_outgoing' => $this->is_outgoing(), 'is_adjustment' => $this->is_adjustment(),
        ];
    }
}

class GenderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'active' => $this->active,
            'display_order' => $this->display_order, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class InventoryValuationMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'method' => $this->method, 'is_default' => $this->is_default,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class TreasuryAccountTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class FiscalStampResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'min_amount' => $this->min_amount, 'max_amount' => $this->max_amount,
            'stamp_value' => $this->stamp_value, 'type' => $this->type, 'active' => $this->active,
            'valid_from' => $this->valid_from?->toIso8601String(), 'valid_to' => $this->valid_to?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class DocumentBaseOperationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ExpenseCategoryPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpenseCategoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense_category');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense_category');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense_category');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense_category');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense_category');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense_category');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense_category');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ExpensePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense');
    }
}
```

## Others

### 📁 D:\xampp\htdocs\sales-management\app\Core/Exports/GenericExport.php
```php
<?php

namespace App\Core\Exports;

use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;

/**
 * تصدير عام يعتمد على Query Builder مع تحويل للبيانات ودعم للـ Chunking.
 * - FromQuery: لتجنب جلب كل البيانات في الذاكرة.
 * - WithMapping: لتنظيف وتحويل البيانات (مثل البوليان والمصفوفات).
 * - ShouldAutoSize: لضبط عرض الأعمدة تلقائيًا.
 */
class GenericExport implements FromQuery, WithHeadings, WithMapping, WithChunkReading, ShouldAutoSize
{
    use Exportable;

    protected Builder $query;
    protected int $chunkSize;
    protected ?array $columns;

    /**
     * @param Builder $query الاستعلام الذي تم بناؤه بواسطة ApiListService
     * @param int $chunkSize حجم القطعة التي يتم معالجتها في الذاكرة
     * @param ?array $columns رؤوس الأعمدة المراد عرضها
     */
    public function __construct(Builder $query, int $chunkSize = 1000, ?array $columns = null)
    {
        $this->query = $query;
        $this->chunkSize = $chunkSize;
        $this->columns = $columns;
    }

    /**
     * 1. تنفيذ الاستعلام للحصول على البيانات في قطع صغيرة (Chunks).
     */
    public function query()
    {
        return $this->query;
    }

    /**
     * 2. تحديد رؤوس الأعمدة.
     * إما بناءً على المصفوفة الممررة ($this->columns) أو استخراجها تلقائيًا.
     */
    public function headings(): array
    {
        if ($this->columns) {
            return $this->columns;
        }

        // استخراج تلقائي من أول صف لضمان التناسق
        $first = $this->query->first();
        if (!$first) {
            return [];
        }

        $data = $first->toArray();
        return array_keys($data);
    }

    /**
     * 3. تحويل كل صف قبل تصديره.
     * الهدف: معالجة البيانات غير المتوافقة مع Excel.
     * @param mixed $row
     * @return array
     */
    public function map($row): array
    {
        // تحويل الصف إلى مصفوفة (سواء كان Model أو Array)
        $data = is_array($row) ? $row : $row->toArray();

        return array_map(function ($value) {
            // تحويل المصفوفات والكائنات إلى JSON
            if (is_array($value) || is_object($value)) {
                return json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            // تحويل القيم المنطقية إلى نص عربي
            if (is_bool($value)) {
                return $value ? 'نعم' : 'لا';
            }
            // استبدال قيم NULL بسلسلة فارغة
            if (is_null($value)) {
                return '';
            }
            return $value;
        }, array_values($data));
    }

    /**
     * 4. تحديد حجم القطعة الواحدة (الـ Chunk).
     */
    public function chunkSize(): int
    {
        return $this->chunkSize;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Filters/RangeFilter.php
```php
<?php

namespace App\Core\Filters;

use Spatie\QueryBuilder\Filters\Filter;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class RangeFilter implements Filter
{
    /**
     * فلتر مخصص للبحث بين قيمتين (نطاق).
     * يقبل 'from,to' أو [from, to] أو قيمة واحدة فقط.
     *
     * @param Builder $query
     * @param mixed $value
     * @param string $property
     */
    public function __invoke(Builder $query, $value, string $property)
    {
        // إذا كانت القيمة نصية نفصلها بفاصلة
        if (is_string($value)) {
            $value = explode(',', $value);
        }

        if (!is_array($value)) {
            return;
        }

        $from = $this->sanitizeValue($value[0] ?? null);
        $to   = $this->sanitizeValue($value[1] ?? null);

        // إذا عندنا قيمتين صحيحتين => whereBetween
        if ($from !== null && $to !== null) {
            $query->whereBetween($property, [$from, $to]);
        }
        // إذا فقط from موجودة
        elseif ($from !== null) {
            $query->where($property, '>=', $from);
        }
        // إذا فقط to موجودة
        elseif ($to !== null) {
            $query->where($property, '<=', $to);
        }
    }

    /**
     * تنظيف وتنسيق القيمة (رقم أو تاريخ)
     *
     * @param mixed $value
     * @return mixed|null
     */
    protected function sanitizeValue($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        // إذا رقم => نحوله float
        if (is_numeric($value)) {
            return (float) $value;
        }

        // إذا تاريخ صالح => نحوله بصيغة Y-m-d
        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Exception $e) {
            return null;
        }
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Exceptions/ApiQueryBuilderException.php
```php
<?php

namespace App\Core\Exceptions;

use Exception;
use Throwable;

/**
 * Custom exception for handling user-facing query builder errors.
 *
 * This exception is thrown when a user provides an invalid parameter for
 * filtering, sorting, or including data, allowing for a specific
 * 400 Bad Request response instead of a generic 500 Server Error.
 */
class ApiQueryBuilderException extends Exception
{
    /**
     * ApiQueryBuilderException constructor.
     *
     * @param string $message The exception message.
     * @param int $code The HTTP status code (defaults to 400).
     * @param Throwable|null $previous The previous throwable used for the exception chaining.
     */
    public function __construct(string $message = "", int $code = 400, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Attributes/Cacheable.php
```php
<?php

namespace App\Core\Attributes;

use Attribute;

/**
 * Attribute لتحديد أن الموديل يجب مراقبته لإبطال الكاش.
 * يستهدف الكلاسات فقط (Attribute::TARGET_CLASS).
 */
#[Attribute(Attribute::TARGET_CLASS)]
class Cacheable
{
    // لا حاجة لأي محتوى هنا، هو مجرد علامة
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Exceptions/BusinessRuleException.php
```php
<?php

namespace App\Core\Exceptions;

use Exception;

/**
 * Business Rule Exception
 *
 * استثناء مخصص لأخطاء قواعد العمل (Business Rules Violations)
 *
 * **متى تستخدمه:**
 * - عندما تمنع عملية بسبب قاعدة عمل (ليس خطأ صلاحيات)
 * - مثل: منع حذف زبون له فواتير
 * - مثل: منع تعديل سند مقفل
 * - مثل: منع بيع منتج نفذ من المخزون
 *
 * **الفرق بين الاستثناءات:**
 * - AuthorizationException (403): المستخدم ليس لديه صلاحية
 * - ValidationException (422): البيانات المُدخلة غير صحيحة
 * - BusinessRuleException (409/400): العملية تخالف قاعدة عمل
 *
 * @package App\Core\Exceptions
 */
class BusinessRuleException extends Exception
{
    /**
     * HTTP Status Code الافتراضي
     * 409 Conflict: الأنسب لأخطاء قواعد العمل
     */
    protected $code = 409;

    /**
     * @param string $message رسالة الخطأ
     * @param int $code كود HTTP (409 افتراضياً)
     * @param \Throwable|null $previous
     */
    public function __construct(string $message = "Business rule violation", int $code = 409, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }

    /**
     * رسالة خطأ مُنسقة للمستخدم
     */
    public function getUserMessage(): string
    {
        return $this->message;
    }

    /**
     * بيانات إضافية للـ Response
     */
    public function getContext(): array
    {
        return [
            'type' => 'BUSINESS_RULE_VIOLATION',
            'message' => $this->message,
            'code' => $this->code,
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Traits/HasStandardizedConfiguration.php
```php
<?php

namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Provides a standardized, cacheable configuration layer for Eloquent models.
 *
 * IMPROVEMENTS v2.0:
 * - ✅ Fixed validation rules (no required + nullable conflict)
 * - ✅ Added SQL injection protection in scopeSearch
 * - ✅ Improved performance with better caching
 * - ✅ Added input sanitization
 * - ✅ Better error handling
 */
trait HasStandardizedConfiguration
{
    /**
     * Get searchable fields
     */
    public static function getSearchableFields(): array
    {
        return static::$searchableFields ?? [];
    }

    /**
     * Get filterable fields
     */
    public static function getFilterable(): array
    {
        return static::$filterable ?? [];
    }

    /**
     * Get sortable fields
     */
    public static function getSortable(): array
    {
        return static::$sortable ?? ['id', 'created_at'];
    }

    /**
     * Get default relationships to load
     */
    public static function getDefaultWith(): array
    {
        return static::$defaultWith ?? [];
    }

    /**
     * Get allowed includes (relationships)
     */
    public static function getAllowedIncludes(): array
    {
        return static::$allowedIncludes ?? [];
    }

    /**
     * Get default sort field
     */
    public static function getDefaultSort(): string
    {
        return static::$defaultSort ?? 'id';
    }

    /**
     * Get default sort direction
     */
    public static function getDefaultSortDirection(): string
    {
        return static::$defaultSortDirection ?? 'asc';
    }

    /**
     * Get default per page
     */
    public static function getDefaultPerPage(): int
    {
        return static::$defaultPerPage ?? 15;
    }

    /**
     * Get per page limit
     */
    public static function getPerPageLimit(): int
    {
        return static::$perPageLimit ?? 100;
    }

    /**
     * Get cache TTL in seconds
     */
    public static function getCacheTtl(): ?int
    {
        return static::$cacheTtl ?? 300;
    }

    /**
     * Get cache tags
     */
    public static function getCacheTags(): array
    {
        return static::$cacheTags ?? [static::getTableName()];
    }

    /**
     * Get relations to invalidate when this model changes
     */
    public static function getCacheInvalidateRelations(): array
    {
        return static::$cacheInvalidateRelations ?? [];
    }

    /**
     * Get table name statically
     */
    public static function getTableName(): string
    {
        return (new static)->getTable();
    }

    /**
     * Get all model configurations as a single array
     */
    public static function getConfiguration(): array
    {
        return [
            'table' => static::getTableName(),
            'searchable_fields' => static::getSearchableFields(),
            'filterable' => static::getFilterable(),
            'sortable' => static::getSortable(),
            'default_with' => static::getDefaultWith(),
            'allowed_includes' => static::getAllowedIncludes(),
            'default_sort' => static::getDefaultSort(),
            'default_sort_direction' => static::getDefaultSortDirection(),
            'default_per_page' => static::getDefaultPerPage(),
            'per_page_limit' => static::getPerPageLimit(),
            'cache_ttl' => static::getCacheTtl(),
            'cache_tags' => static::getCacheTags(),
            'cache_invalidate_relations' => static::getCacheInvalidateRelations(),
        ];
    }

    /**
     * Scope: Active Records
     */
    public function scopeActive(Builder $query): Builder
    {
        if ($this->hasColumn('active')) {
            return $query->where('active', true);
        }
        if ($this->hasColumn('status')) {
            return $query->where('status', 'active');
        }
        return $query;
    }

    /**
     * Scope: Published records
     */
    public function scopePublished(Builder $query): Builder
    {
        if ($this->hasColumn('published_at')) {
            return $query->whereNotNull('published_at')->where('published_at', '<=', now());
        }
        return $query;
    }

    /**
     * ✅ Scope: Search across all searchable fields (SQL Injection Protected)
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        $searchableFields = static::getSearchableFields();
        if (empty($searchableFields)) {
            return $query;
        }

        // ✅ Sanitize search term to prevent SQL injection
        $term = $this->sanitizeSearchTerm($term);

        return $query->where(function ($q) use ($term, $searchableFields) {
            foreach ($searchableFields as $field) {
                if ($this->hasColumn($field)) {
                    $q->orWhere($field, 'LIKE', "%{$term}%");
                }
            }
        });
    }

    /**
     * ✅ Sanitize search term to prevent SQL injection
     */
    protected function sanitizeSearchTerm(string $term): string
    {
        // 1. Escape SQL wildcards
        $term = str_replace(['%', '_'], ['\\%', '\\_'], $term);

        // 2. Remove control characters
        $term = preg_replace('/[\x00-\x1F\x7F]/u', '', $term);

        // 3. Trim whitespace
        $term = trim($term);

        // 4. Limit length
        $term = mb_substr($term, 0, 255);

        return $term;
    }

    /**
     * Checks if the model has a specific column, with caching for performance
     */
    protected function hasColumn(string $column): bool
    {
        static $columns = [];
        $table = $this->getTable();

        if (!isset($columns[$table])) {
            $columns[$table] = Cache::remember(
                "schema:columns:{$table}",
                now()->addDay(),
                fn() => Schema::getColumnListing($table)
            );
        }

        return in_array($column, $columns[$table]);
    }

    /**
     * ✅ Generates validation rules (FIXED: No required + nullable conflict)
     */
    public static function getValidationRules(bool $isUpdate = false): array
    {
        $model = new static;
        $rules = [];

        foreach ($model->getFillable() as $field) {
            // ✅ FIXED: Proper handling of required vs nullable
            $fieldRules = $isUpdate
                ? ['sometimes', 'nullable']
                : ['required'];

            $cast = $model->getCasts()[$field] ?? null;

            switch ($cast) {
                case 'int':
                case 'integer':
                    $fieldRules[] = 'integer';
                    $fieldRules[] = 'min:0';
                    break;

                case 'bool':
                case 'boolean':
                    $fieldRules[] = 'boolean';
                    break;

                case 'float':
                case 'double':
                case 'decimal':
                    $fieldRules[] = 'numeric';
                    $fieldRules[] = 'min:0';
                    break;

                case 'date':
                case 'datetime':
                case 'timestamp':
                    $fieldRules[] = 'date';
                    break;

                case 'array':
                case 'json':
                    $fieldRules[] = 'array';
                    break;

                default:
                    if (!Str::endsWith($field, '_id')) {
                        $fieldRules[] = 'string';
                        $fieldRules[] = 'max:255';
                    }
            }

            // Email validation
            if (Str::contains($field, 'email')) {
                $fieldRules[] = 'email';
                $fieldRules[] = 'max:255';
            }

            // Foreign key validation
            if (Str::endsWith($field, '_id')) {
                $table = Str::plural(Str::beforeLast($field, '_id'));
                if (Schema::hasTable($table)) {
                    $fieldRules[] = "exists:{$table},id";
                }
            }

            $rules[$field] = array_unique($fieldRules);
        }

        return $rules;
    }

    /**
     * Toggles the 'active' status of the model
     */
    public function toggleActive(): bool
    {
        if ($this->hasColumn('active')) {
            $this->active = !$this->active;
            return $this->save();
        }
        return false;
    }

    /**
     * Sets the model's 'published_at' timestamp to the current time
     */
    public function publish(): bool
    {
        if ($this->hasColumn('published_at')) {
            $this->published_at = now();
            return $this->save();
        }
        return false;
    }

    /**
     * Unpublishes the model by setting 'published_at' to null
     */
    public function unpublish(): bool
    {
        if ($this->hasColumn('published_at')) {
            $this->published_at = null;
            return $this->save();
        }
        return false;
    }

    /**
     * Gets the model's age in days
     */
    public function getAgeInDays(): int
    {
        return $this->created_at->diffInDays(now());
    }

    /**
     * Gets the model's age in a human-readable format
     */
    public function getAgeForHumans(): string
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * ✅ Check if model is cacheable
     */
    public static function isCacheable(): bool
    {
        $ttl = static::getCacheTtl();
        return $ttl !== null && $ttl > 0;
    }

    /**
     * ✅ Get cache key for this model instance
     */
    public function getCacheKey(string $suffix = ''): string
    {
        $table = $this->getTable();
        $id = $this->getKey();

        return $suffix
            ? "{$table}:{$id}:{$suffix}"
            : "{$table}:{$id}";
    }

    /**
     * ✅ Clear cache for this model instance
     */
    public function clearCache(): void
    {
        if (!static::isCacheable()) {
            return;
        }

        $tags = static::getCacheTags();
        Cache::tags($tags)->flush();
    }

    /**
     * ✅ Remember in cache with model's TTL
     */
    public function remember(string $key, \Closure $callback)
    {
        if (!static::isCacheable()) {
            return $callback();
        }

        $ttl = static::getCacheTtl();
        $tags = static::getCacheTags();

        return Cache::tags($tags)->remember($key, $ttl, $callback);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Traits/Auditable.php
```php
<?php

namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Basic Auditable trait for tracking who created/updated/deleted records
 */
trait Auditable
{
    public static function bootAuditable()
    {
        static::creating(function ($model) {
            if (auth()->check()) {
                $model->created_by = auth()->id();
            }
        });

        static::updating(function ($model) {
            if (auth()->check()) {
                $model->updated_by = auth()->id();
            }
        });

        static::deleting(function ($model) {
            if (auth()->check()) {
                $model->deleted_by = auth()->id();
            }
        });
    }

    /**
     * Get the user who created this record
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Get the user who last updated this record
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }

    /**
     * Get the user who deleted this record
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'deleted_by');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Exceptions/FiscalYearClosedException.php
```php
<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * استثناء مخصص لمحاولة التعديل على سنة مالية مقفلة
 */
class FiscalYearClosedException extends Exception
{
    protected $code = 403;

    /**
     * تحويل الاستثناء إلى HTTP Response
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error_code' => 'FISCAL_YEAR_CLOSED',
        ], 403);
    }

    /**
     * تسجيل الاستثناء في Logs
     */
    public function report(): void
    {
        logger()->warning('محاولة تعديل على سنة مالية مقفلة', [
            'user_id' => auth()->id(),
            'ip' => request()->ip(),
            'url' => request()->fullUrl(),
        ]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Core/Traits/HashesId.php
```php
<?php

namespace App\Core\Traits;

use Vinkla\Hashids\Facades\Hashids;
use Illuminate\Support\Facades\Log;

/**
 * HashesId Trait - Enhanced v2.0
 *
 * IMPROVEMENTS:
 * - ✅ Comprehensive error handling
 * - ✅ Logging for debugging
 * - ✅ Better validation
 * - ✅ Support for custom error messages
 * - ✅ Added helper methods
 */
trait HashesId
{
    /**
     * Get the hashed route key for the model
     */
    public function getRouteKey()
    {
        try {
            $id = $this->getKey();

            if (empty($id)) {
                Log::warning('HashesId: Attempted to hash empty ID', [
                    'model' => get_class($this)
                ]);
                return null;
            }

            return Hashids::encode($id);

        } catch (\Throwable $e) {
            Log::error('HashesId: Failed to encode ID', [
                'model' => get_class($this),
                'id' => $this->getKey(),
                'error' => $e->getMessage()
            ]);

            // Fallback to original ID in case of error
            return $this->getKey();
        }
    }

    /**
     * ✅ Retrieve the model for a bound value (Enhanced with error handling)
     */
    public function resolveRouteBinding($value, $field = null)
    {
        try {
            // 1. Validate input
            if (empty($value)) {
                return null;
            }

            // 2. Try to decode the hash
            $decoded = Hashids::decode($value);

            if (empty($decoded)) {
                Log::debug('HashesId: Failed to decode hash', [
                    'model' => get_class($this),
                    'value' => $value
                ]);

                // ✅ Throw 404 instead of returning null
                abort(404, $this->getNotFoundMessage());
            }

            $id = $decoded[0];

            // 3. Validate decoded ID
            if (!is_numeric($id) || $id <= 0) {
                Log::warning('HashesId: Invalid decoded ID', [
                    'model' => get_class($this),
                    'value' => $value,
                    'decoded' => $id
                ]);

                abort(404, $this->getNotFoundMessage());
            }

            // 4. Find the model
            $model = $this->where($this->getRouteKeyName(), $id)->first();

            if (!$model) {
                Log::info('HashesId: Model not found', [
                    'model' => get_class($this),
                    'id' => $id,
                    'hash' => $value
                ]);

                abort(404, $this->getNotFoundMessage());
            }

            return $model;

        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            // Re-throw HTTP exceptions (like 404)
            throw $e;

        } catch (\Throwable $e) {
            Log::error('HashesId: Unexpected error in route binding', [
                'model' => get_class($this),
                'value' => $value,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            abort(500, 'An error occurred while processing your request.');
        }
    }

    /**
     * ✅ Get custom "not found" message
     */
    protected function getNotFoundMessage(): string
    {
        $modelName = class_basename(get_class($this));

        // Check if model has custom message property
        if (property_exists($this, 'notFoundMessage')) {
            return $this->notFoundMessage;
        }

        return __('messages.model_not_found', [
            'model' => $modelName
        ], "{$modelName} not found.");
    }

    /**
     * ✅ Encode an ID to hash (static helper)
     */
    public static function encodeId($id): ?string
    {
        try {
            if (empty($id) || !is_numeric($id)) {
                return null;
            }

            return Hashids::encode($id);

        } catch (\Throwable $e) {
            Log::error('HashesId: Static encode failed', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * ✅ Decode a hash to ID (static helper)
     */
    public static function decodeId(string $hash): ?int
    {
        try {
            if (empty($hash)) {
                return null;
            }

            $decoded = Hashids::decode($hash);

            if (empty($decoded)) {
                return null;
            }

            return $decoded[0];

        } catch (\Throwable $e) {
            Log::error('HashesId: Static decode failed', [
                'hash' => $hash,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * ✅ Check if a value is a valid hash
     */
    public static function isValidHash(string $value): bool
    {
        try {
            $decoded = Hashids::decode($value);
            return !empty($decoded) && is_numeric($decoded[0]) && $decoded[0] > 0;

        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * ✅ Get hashed ID attribute (for API responses)
     */
    public function getHashedIdAttribute(): ?string
    {
        return $this->getRouteKey();
    }

    /**
     * ✅ Get URL with hashed ID
     */
    public function getUrlAttribute(): string
    {
        $routeName = $this->getRouteNameForUrl();
        $hashedId = $this->getRouteKey();

        if (!$routeName || !$hashedId) {
            return '#';
        }

        try {
            return route($routeName, ['id' => $hashedId]);
        } catch (\Throwable $e) {
            Log::error('HashesId: Failed to generate URL', [
                'model' => get_class($this),
                'route' => $routeName,
                'id' => $hashedId,
                'error' => $e->getMessage()
            ]);
            return '#';
        }
    }

    /**
     * ✅ Get route name for URL generation
     * Override this in your model if needed
     */
    protected function getRouteNameForUrl(): ?string
    {
        // Default pattern: model.show
        $modelName = strtolower(class_basename(get_class($this)));
        return "{$modelName}.show";
    }

    /**
     * ✅ Append hashed_id to array/JSON output
     */
    public function initializeHashesId(): void
    {
        // Automatically append hashed_id when model is converted to array/JSON
        if (!in_array('hashed_id', $this->appends)) {
            $this->append('hashed_id');
        }
    }
}

```

