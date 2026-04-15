<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * PriceLevel Model
 *
 * Table: price_levels
 * Different pricing tiers for products
 */
#[Cacheable]
class PriceLevel extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'price_levels';

    protected $fillable = [
        'name',
        'description',
        'is_percentage',
        'value',
        'active',
        'display_order',
    ];

    protected $casts = [
        'is_percentage' => 'boolean',
        'value' => 'decimal:2',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['active', 'is_percentage'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productVariantPrices', 'parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['price_levels', 'lookups'];

    public function productVariantPrices(): HasMany
    {
        return $this->hasMany(ProductVariantPrice::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class, 'default_price_level_id');
    }

    public function calculatePrice(float $basePrice): float
    {
        if ($this->is_percentage) {
            return $basePrice * (1 + $this->value / 100);
        }

        return $basePrice + $this->value;
    }
}
