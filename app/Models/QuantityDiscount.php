<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * QuantityDiscount Model
 *
 * Table: quantity_discounts
 * Volume-based discounts for product variants
 */
#[Cacheable]
class QuantityDiscount extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'quantity_discounts';

    protected $fillable = [
        'product_variant_id',
        'min_quantity',
        'max_quantity',
        'discount_per_unit',
        'discount_percentage',
        'tier_order',
        'active',
        'valid_from',
        'valid_to',
    ];

    protected $casts = [
        'min_quantity' => 'decimal:4',
        'max_quantity' => 'decimal:4',
        'discount_per_unit' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'tier_order' => 'integer',
        'active' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['product_variant_id', 'active'];
    public static array $sortable = ['id', 'min_quantity', 'tier_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productVariant'];
    public static string $defaultSort = 'tier_order';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['quantity_discounts'];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
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

    public function scopeForQuantity(Builder $query, float $quantity): Builder
    {
        return $query->where('min_quantity', '<=', $quantity)
            ->where(function ($q) use ($quantity) {
                $q->whereNull('max_quantity')
                    ->orWhere('max_quantity', '>=', $quantity);
            });
    }

    public function appliesTo(float $quantity): bool
    {
        return $quantity >= $this->min_quantity
            && (is_null($this->max_quantity) || $quantity <= $this->max_quantity);
    }

    public function calculateDiscount(float $basePrice, float $quantity): float
    {
        if ($this->discount_percentage) {
            return $basePrice * $quantity * ($this->discount_percentage / 100);
        }

        return $this->discount_per_unit * $quantity;
    }
}
