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
