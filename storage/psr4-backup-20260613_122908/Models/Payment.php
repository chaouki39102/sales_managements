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
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;

#[Cacheable]
class Payment extends Model
{
    use HasStandardizedConfiguration, SoftDeletes,
        HasCompany, Auditable, BelongsToFiscalYear, HasTenantRouteBinding;

    protected $table = 'payments';

    protected $fillable = [
        'company_id',
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

    public static array $searchableFields = ['payment_number', 'reference', 'bank_reference', 'notes'];
    public static array $filterable = [
        'payment_mode_id', 'treasury_account_id', 'check_id', 'party_id',
        'fiscal_year_id', 'currency_id', 'user_id', 'status', 'is_reconciled'
    ];
    public static array $sortable = ['id', 'payment_number', 'payment_date', 'amount', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'currency', 'paymentMode', 'treasuryAccount', 'check', 'party',
        'fiscalYear', 'user', 'commercialDocuments', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'payment_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['payments'];
    public static array $cacheInvalidateRelations = ['commercialDocuments'];
    public static array $scopes = [];

    public function currency(): BelongsTo { return $this->belongsTo(Currency::class); }
    public function paymentMode(): BelongsTo { return $this->belongsTo(PaymentMode::class); }
    public function treasuryAccount(): BelongsTo { return $this->belongsTo(TreasuryAccount::class); }
    public function check(): BelongsTo { return $this->belongsTo(Check::class); }
    public function party(): BelongsTo { return $this->belongsTo(Party::class); }
    public function fiscalYear(): BelongsTo { return $this->belongsTo(FiscalYear::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function commercialDocuments(): BelongsToMany
    {
        return $this->belongsToMany(CommercialDocument::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }

    public function scopeConfirmed(Builder $query): Builder { return $query->where('status', 'confirmed'); }
    public function scopePending(Builder $query): Builder { return $query->where('status', 'pending'); }
    public function scopeReconciled(Builder $query): Builder { return $query->where('is_reconciled', true); }
    public function scopeUnreconciled(Builder $query): Builder { return $query->where('is_reconciled', false); }

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
