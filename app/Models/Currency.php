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
        'active',
    ];

    protected $casts = [
        'decimal_places' => 'integer',
        'is_base_currency' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'symbol'];
    public static array $filterable = ['active', 'is_base_currency'];
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
            ->where('active', true)
            ->first();
    }

    public function formatAmount(float $amount): string
    {
        return number_format($amount, $this->decimal_places) . ' ' . $this->symbol;
    }

    protected static function boot(): void
{
    parent::boot();

    static::creating(function (self $model): void {
        $model->slug = static::uniqueSlug($model->name, $model->company_id);
    });

    static::updating(function (self $model): void {
        if ($model->isDirty('name')) {
            $model->slug = static::uniqueSlug($model->name, $model->company_id, $model->id);
        }
    });
}

public static function uniqueSlug(string $name, int $companyId, ?int $ignoreId = null): string
{
    $slug = \Illuminate\Support\Str::slug($name) ?: preg_replace('/\s+/u', '-', trim(mb_strtolower($name)));
    $originalSlug = $slug;
    $count = 1;

    while (\Illuminate\Support\Facades\DB::table('currencies')
        ->where('slug', $slug)
        ->when($ignoreId, function ($query) use ($ignoreId) {
            return $query->where('id', '!=', $ignoreId);
        })
        ->exists()
    ) {
        $slug = $originalSlug . '-' . $count++;
    }

    return $slug;
}
}
