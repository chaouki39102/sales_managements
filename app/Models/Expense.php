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
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;

#[Cacheable]
class Expense extends Model
{
    use HasStandardizedConfiguration, SoftDeletes,
        HasCompany, Auditable, BelongsToFiscalYear, HasTenantRouteBinding;

    protected $table = 'expenses';

    protected $fillable = [
        'company_id',
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

    public static array $searchableFields = ['expense_number', 'description', 'reference'];
    public static array $filterable = [
        'expense_category_id', 'fiscal_year_id', 'payment_mode_id',
        'treasury_account_id', 'party_id', 'status', 'is_paid', 'is_recurring'
    ];
    public static array $sortable = ['id', 'expense_number', 'date', 'amount', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'expenseCategory', 'fiscalYear', 'paymentMode', 'treasuryAccount',
        'party', 'attachments', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['expenses'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

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
