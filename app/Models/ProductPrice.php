<?php

namespace App\Models;

use App\Core\Traits\HasStandardizedConfiguration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


// ═══════════════════════════════════════════════════════════
// ProductPrice — التعريفات (Tarifs)
// ═══════════════════════════════════════════════════════════

/**
 * Table: product_prices
 *
 * ثلاث طرق للتسعير — الحساب في PHP فقط (لا price_computed في DB):
 *
 *   fixed  → price_ht = price
 *   rate   → price_ht = purchase_price_ht × (1 + rate/100)
 *   margin → price_ht = purchase_price_ht + margin
 */
class ProductPrice extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'product_prices';

    protected $fillable = [
        'product_id', 'price_level_id',
        'pricing_method',
        'price', 'rate', 'margin',
        'active',
    ];

    protected $casts = [
        'price'  => 'decimal:4',
        'rate'   => 'decimal:4',
        'margin' => 'decimal:4',
        'active' => 'boolean',
    ];

    public static array $filterable      = ['product_id', 'price_level_id', 'active', 'pricing_method'];
    public static array $sortable        = ['id', 'price_level_id'];
    public static array $allowedIncludes = ['product', 'priceLevel'];
    public static string $defaultSort    = 'price_level_id';
    public static array $cacheTags       = ['product_prices', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class);
    }

    /**
     * حساب سعر البيع HT بناءً على طريقة التسعير وسعر الشراء
     *
     * @param float $purchasePriceHt سعر الشراء من جدول products
     */
    public function computePrice(float $purchasePriceHt): float
    {
        return match ($this->pricing_method) {
            'rate'   => round($purchasePriceHt * (1 + ((float)($this->rate   ?? 0)) / 100), 4),
            'margin' => round($purchasePriceHt  +      (float)($this->margin ?? 0),         4),
            default  => round((float)($this->price ?? 0), 4),
        };
    }

    /**
     * قيمة الهامش المحسوب (للعرض في الواجهة)
     */
    public function computedMargin(float $purchasePriceHt): float
    {
        return round($this->computePrice($purchasePriceHt) - $purchasePriceHt, 4);
    }

    /**
     * نسبة الربح المحسوبة (للعرض في الواجهة)
     */
    public function computedRate(float $purchasePriceHt): float
    {
        if (!$purchasePriceHt) return 0.0;
        return round((($this->computePrice($purchasePriceHt) / $purchasePriceHt) - 1) * 100, 4);
    }
}
