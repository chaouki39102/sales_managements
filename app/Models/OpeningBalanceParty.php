<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * OpeningBalanceParty Model
 *
 * Table: opening_balances_parties
 * Opening balances for parties (customers/suppliers)
 */
#[Cacheable]
class OpeningBalanceParty extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'opening_balances_parties';

    protected $fillable = [
        'fiscal_year_id',
        'party_id',
        'opening_balance',
        'balance_type',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'party_id', 'balance_type'];
    public static array $sortable = ['id', 'opening_balance', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'party'];
    public static string $defaultSort = 'party_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_parties'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function isDebit(): bool
    {
        return $this->balance_type === 'debit';
    }

    public function isCredit(): bool
    {
        return $this->balance_type === 'credit';
    }
}
