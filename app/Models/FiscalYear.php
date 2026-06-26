<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class FiscalYear extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'fiscal_years';

    protected $fillable = [
        'company_id',
        'name',
        'start_date',
        'end_date',
        'is_closed',
        'closed_at',
        'closed_by',
        'is_current',
        'closing_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
        'closed_at' => 'date',
        'is_current' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name'];
    public static array $filterable = ['is_closed', 'is_current'];
    public static array $sortable = ['id', 'name', 'start_date', 'end_date', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'closedBy', 'commercialDocuments', 'stockMovements', 'payments',
        'expenses', 'openingBalancesStock', 'openingBalancesParties',
        'openingBalancesTreasury', 'posSessions'
    ];
    public static string $defaultSort = 'start_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['fiscal_years'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

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

    public function openingBalancesTreasury(): HasMany
    {
        return $this->hasMany(OpeningBalanceTreasury::class);
    }

    public function posSessions(): HasMany
    {
        return $this->hasMany(PosSession::class);
    }

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
        static::where('id', '!=', $this->id)->update(['is_current' => false]);
        return $this->update(['is_current' => true]);
    }

    public function isActive(): bool
    {
        return !$this->is_closed && now()->between($this->start_date, $this->end_date);
    }
}