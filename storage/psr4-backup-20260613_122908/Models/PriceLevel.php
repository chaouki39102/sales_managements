<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class PriceLevel extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'price_levels';

    protected $fillable = [
        'company_id',
        'name',
        'description',
        'is_default',
        'is_percentage',
        'value',
        'active',
        'display_order',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_percentage' => 'boolean',
        'value' => 'decimal:2',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['active', 'is_percentage', 'is_default'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productPrices', 'parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['price_levels', 'lookups'];

    public function productPrices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
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
