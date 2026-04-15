<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * ProductVariantPrice Model
 *
 * Table: product_variant_prices
 * Manages different pricing levels for product variants
 */
#[Cacheable]
class ProductVariantPrice extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'product_variant_prices';

    protected $fillable = [
        'product_variant_id',
        'price_level_id',
        'price',
        'valid_from',
        'valid_to',
        'active',
    ];

    protected $casts = [
        'price' => 'decimal:4',
        'valid_from' => 'date',
        'valid_to' => 'date',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['product_variant_id', 'price_level_id', 'active'];
    public static array $sortable = ['id', 'price', 'valid_from'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productVariant', 'priceLevel'];
    public static string $defaultSort = 'valid_from';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_variant_prices'];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function priceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class);
    }

    public function scopeValid(Builder $query, $date = null): Builder
    {
        $date = $date ?? now();

        return $query->where('active', true)
            ->where('valid_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('valid_to')
                    ->orWhere('valid_to', '>=', $date);
            });
    }

    public function isValid($date = null): bool
    {
        $date = $date ?? now();

        return $this->active
            && $this->valid_from <= $date
            && (is_null($this->valid_to) || $this->valid_to >= $date);
    }
}
