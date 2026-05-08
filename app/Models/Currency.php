<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Currency extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'currencies';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'symbol',
        'decimal_places',
        'is_base_currency',
        'is_active',
    ];

    protected $casts = [
        'decimal_places' => 'integer',
        'is_base_currency' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'symbol'];
    public static array $filterable = ['is_active', 'is_base_currency'];
    public static array $sortable = ['id', 'name', 'code'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocuments', 'payments', 'exchangeRatesFrom', 'exchangeRatesTo'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['currencies', 'lookups'];

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function exchangeRatesFrom(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'from_currency_id');
    }

    public function exchangeRatesTo(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'to_currency_id');
    }

    public function scopeBaseCurrency(Builder $query): Builder
    {
        return $query->where('is_base_currency', true);
    }

    public static function getBaseCurrency(): ?self
    {
        return static::where('is_base_currency', true)
            ->where('is_active', true)
            ->first();
    }

    public function formatAmount(float $amount): string
    {
        return number_format($amount, $this->decimal_places) . ' ' . $this->symbol;
    }
}