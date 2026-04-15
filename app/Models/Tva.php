<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Tva Model
 *
 * Table: tvas
 * VAT (Value Added Tax) rates
 */
#[Cacheable]
class Tva extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'tvas';

    protected $fillable = [
        'name',
        'rate',
        'description',
        'active',
        'is_default',
        'display_order',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'active' => 'boolean',
        'is_default' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['active', 'is_default'];
    public static array $sortable = ['id', 'name', 'rate', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productVariants'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['tvas', 'lookups'];

    public function productVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    public static function getDefaultRate(): ?float
    {
        return static::where('is_default', true)
            ->where('active', true)
            ->value('rate');
    }
}
