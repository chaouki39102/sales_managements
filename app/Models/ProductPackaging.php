<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;

// ═══════════════════════════════════════════════════════════
// ProductPackaging — وحدات التعبئة (Colisages)
// ═══════════════════════════════════════════════════════════

/**
 * Table: product_packagings
 *
 * UN=1 / FD=6 / PLT=480
 * سعر التعبئة = product.computedPrice(level) × quantity
 */
class ProductPackaging extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'product_packagings';

    protected $fillable = [
        'product_id', 'code', 'label',
        'quantity', 'barcode',
        'is_default', 'active', 'display_order',
    ];

    protected $casts = [
        'quantity'      => 'decimal:4',
        'is_default'    => 'boolean',
        'active'        => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['code', 'label', 'barcode'];
    public static array $filterable       = ['product_id', 'active', 'is_default'];
    public static array $sortable         = ['id', 'display_order', 'quantity'];
    public static array $allowedIncludes  = ['product'];
    public static string $defaultSort     = 'display_order';
    public static array $cacheTags        = ['product_packagings', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * سعر هذه التعبئة لمستوى سعر معين
     */
    public function priceForLevel(int $priceLevelId): float
    {
        $unitPrice = $this->product->computedPrice($priceLevelId);
        return round($unitPrice * (float) $this->quantity, 4);
    }
}
