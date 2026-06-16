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
use App\Models\Traits\HasCompany;
use App\Services\TreasuryBalanceService;

#[Cacheable]
class TreasuryAccount extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes, Auditable;

    protected $table = 'treasury_accounts';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'treasury_account_type_id',
        'bank_name',
        'account_number',
        'rib',
        'iban',
        'swift_bic',
        'currency_id',
        'current_balance', // cache فقط — يُحدَّث عبر PaymentService
        'is_default',
        'active',
        'notes',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'current_balance' => 'decimal:4',
        'is_default'      => 'boolean',
        'active'          => 'boolean',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
        'deleted_at'      => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'bank_name', 'account_number', 'rib', 'iban'];
    public static array $filterable       = ['treasury_account_type_id', 'is_default', 'active', 'currency_id'];
    public static array $sortable         = ['id', 'name', 'code', 'current_balance'];
    public static array $defaultWith      = [];
    public static array $allowedIncludes  = [
        'treasuryAccountType', 'currency', 'payments',
        'paymentModes', 'expenses', 'openingBalances',
        'createdBy', 'updatedBy', 'deletedBy',
    ];
    public static string $defaultSort     = 'name';
    public static ?int $cacheTtl          = 300;
    public static array $cacheTags        = ['treasury_accounts'];

    public function treasuryAccountType(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccountType::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentModes(): HasMany
    {
        return $this->hasMany(PaymentMode::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceTreasury::class);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    public function scopeBankAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', fn($q) => $q->where('name', 'bank'));
    }

    public function scopeCashAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', fn($q) => $q->where('name', 'cash'));
    }

    public function isBankAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'bank';
    }

    public function isCashAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'cash';
    }

    /**
     * رصيد حقيقي محسوب من TreasuryBalanceService.
     * WARNING: 2 DB queries — لا تستخدمه داخل قوائم/collections.
     * استخدم getAllTreasuryBalancesAt() لشاشات القوائم.
     */
    public function getComputedBalanceAttribute(): float
    {
        return app(TreasuryBalanceService::class)
            ->getTreasuryBalanceAt($this->id, now()->toDateString())['current_balance'];
    }
}
