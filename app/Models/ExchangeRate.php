<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ExchangeRate extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'exchange_rates';

    protected $fillable = [
        'company_id',
        'from_currency_id',
        'to_currency_id',
        'rate',
        'rate_date',
    ];

    protected $casts = [
        'rate' => 'decimal:8',
        'rate_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['from_currency_id', 'to_currency_id', 'rate_date'];
    public static array $sortable = ['id', 'rate_date', 'rate'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fromCurrency', 'toCurrency'];
    public static string $defaultSort = 'rate_date';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 1800;
    public static array $cacheTags = ['exchange_rates'];

    public function fromCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'from_currency_id');
    }

    public function toCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'to_currency_id');
    }

    public function scopeLatest(Builder $query): Builder
    {
        return $query->orderBy('rate_date', 'desc');
    }

    public function scopeForDate(Builder $query, $date): Builder
    {
        return $query->where('rate_date', '<=', $date)
            ->orderBy('rate_date', 'desc')
            ->limit(1);
    }

    public function scopeBetweenCurrencies(Builder $query, int $fromId, int $toId): Builder
    {
        return $query->where('from_currency_id', $fromId)
            ->where('to_currency_id', $toId);
    }
}