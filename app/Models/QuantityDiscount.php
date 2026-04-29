<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

// ═══════════════════════════════════════════════════════════
// QuantityDiscount — تخفيضات الكميات (Tx Remise)
// ═══════════════════════════════════════════════════════════

/**
 * Table: quantity_discounts
 *
 * كل تعريفة + منتج لها شرائح مستقلة.
 * الكميات دائماً بالوحدة الأساسية.
 */
class QuantityDiscount extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'quantity_discounts';

    protected $fillable = [
        'product_id', 'price_level_id',
        'min_qty', 'max_qty',
        'discount_amount', 'discount_percentage',
        'tier_order', 'is_blocked', 'active',
    ];

    protected $casts = [
        'min_qty'             => 'decimal:4',
        'max_qty'             => 'decimal:4',
        'discount_amount'     => 'decimal:4',
        'discount_percentage' => 'decimal:4',
        'tier_order'          => 'integer',
        'is_blocked'          => 'boolean',
        'active'              => 'boolean',
    ];

    public static array $filterable      = ['product_id', 'price_level_id', 'active', 'is_blocked'];
    public static array $sortable        = ['id', 'min_qty', 'tier_order'];
    public static array $allowedIncludes = ['product', 'priceLevel'];
    public static string $defaultSort    = 'tier_order';
    public static array $cacheTags       = ['quantity_discounts', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class);
    }

    /**
     * هل هذه الشريحة تنطبق على الكمية المعطاة؟
     */
    public function appliesTo(float $qty): bool
    {
        return $this->active
            && !$this->is_blocked
            && $qty >= (float) $this->min_qty
            && (is_null($this->max_qty) || $qty <= (float) $this->max_qty);
    }

    /**
     * حساب السعر النهائي بعد تطبيق الخصم
     *
     * الأولوية: discount_percentage > discount_amount
     */
    public function calculateDiscountedPrice(float $unitPrice): float
    {
        if ($this->discount_percentage) {
            return round($unitPrice * (1 - (float) $this->discount_percentage / 100), 4);
        }
        if ($this->discount_amount) {
            return round(max(0, $unitPrice - (float) $this->discount_amount), 4);
        }
        return $unitPrice;
    }

    /**
     * قيمة الخصم على الوحدة (للعرض)
     */
    public function discountValue(float $unitPrice): float
    {
        return round($unitPrice - $this->calculateDiscountedPrice($unitPrice), 4);
    }
}
