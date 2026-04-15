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
