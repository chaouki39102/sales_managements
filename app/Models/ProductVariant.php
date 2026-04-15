<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * ProductVariant Model
 *
 * Table: product_variants
 * Represents sellable SKUs with unique pricing and inventory
 */
#[Cacheable]
class ProductVariant extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'product_variants';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'product_id',
        'ref',
        'barcode',
        'variant_name',
        'unit_id',
        'tva_id',
        'last_purchase_price',
        'average_cost_price',
        'default_selling_price_ht',
        'manages_stock',
        'allow_negative_stock',
        'has_lots',
        'has_expiration_date',
        'min_stock_alert',
        'max_stock_alert',
        'manages_quantity_discounts',
        'weight',
        'volume',
        'length',
        'width',
        'height',
        'variant_attributes',
        'valuation_method_id',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'last_purchase_price' => 'decimal:4',
        'average_cost_price' => 'decimal:4',
        'default_selling_price_ht' => 'decimal:4',
        'manages_stock' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'has_lots' => 'boolean',
        'has_expiration_date' => 'boolean',
        'min_stock_alert' => 'decimal:4',
        'max_stock_alert' => 'decimal:4',
        'manages_quantity_discounts' => 'boolean',
        'weight' => 'decimal:3',
        'volume' => 'decimal:3',
        'length' => 'decimal:4',
        'width' => 'decimal:4',
        'height' => 'decimal:4',
        'variant_attributes' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['current_stock', 'is_low_stock'];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'ref',
        'barcode',
        'variant_name',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_id',
        'unit_id',
        'tva_id',
        'valuation_method_id',
        'manages_stock',
        'has_lots',
        'has_expiration_date',
        'manages_quantity_discounts',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'ref',
        'variant_name',
        'default_selling_price_ht',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'product',
        'unit',
        'tva',
        'valuationMethod',
        'prices',
        'quantityDiscounts',
        'stockMovements',
        'productLots',
        'commercialDocumentLines',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'ref';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['product_variants', 'products'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [
        'prices',
        'stockMovements',
        'productLots',
    ];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tva(): BelongsTo
    {
        return $this->belongsTo(Tva::class);
    }

    public function valuationMethod(): BelongsTo
    {
        return $this->belongsTo(InventoryValuationMethod::class, 'valuation_method_id');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductVariantPrice::class);
    }

    public function quantityDiscounts(): HasMany
    {
        return $this->hasMany(QuantityDiscount::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function productLots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function commercialDocumentLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }

    // -------------------- Scopes --------------------

    public function scopeManagesStock(Builder $query): Builder
    {
        return $query->where('manages_stock', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereRaw('
            (SELECT COALESCE(SUM(stock_balance_after), 0)
             FROM stock_movements
             WHERE product_variant_id = product_variants.id
             ORDER BY movement_date DESC, id DESC
             LIMIT 1) <= min_stock_alert
        ');
    }

    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->whereRaw('
            (SELECT COALESCE(SUM(stock_balance_after), 0)
             FROM stock_movements
             WHERE product_variant_id = product_variants.id
             ORDER BY movement_date DESC, id DESC
             LIMIT 1) <= 0
        ');
    }

    // -------------------- Accessors --------------------

    /**
     * Get current stock quantity across all warehouses
     */
    public function getCurrentStockAttribute(): float
    {
        return $this->stockMovements()
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0;
    }

    /**
     * Check if stock is below minimum alert level
     */
    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) {
            return false;
        }

        return $this->current_stock <= $this->min_stock_alert;
    }

    // -------------------- Helpers --------------------

    /**
     * Get stock by warehouse
     */
    public function getStockByWarehouse(int $warehouseId): float
    {
        return $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0;
    }

    /**
     * Get price for specific price level
     */
    public function getPriceForLevel(int $priceLevelId): ?float
    {
        return $this->prices()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->where('valid_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('valid_to')
                    ->orWhere('valid_to', '>=', now());
            })
            ->value('price');
    }

    /**
     * Get applicable quantity discount
     */
    public function getQuantityDiscount(float $quantity): ?QuantityDiscount
    {
        if (!$this->manages_quantity_discounts) {
            return null;
        }

        return $this->quantityDiscounts()
            ->where('active', true)
            ->where('min_quantity', '<=', $quantity)
            ->where(function ($q) use ($quantity) {
                $q->whereNull('max_quantity')
                    ->orWhere('max_quantity', '>=', $quantity);
            })
            ->where('valid_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('valid_to')
                    ->orWhere('valid_to', '>=', now());
            })
            ->orderBy('tier_order')
            ->first();
    }

    /**
     * Calculate final price with quantity discount
     */
    public function calculateFinalPrice(float $quantity, ?int $priceLevelId = null): float
    {
        $basePrice = $priceLevelId
            ? $this->getPriceForLevel($priceLevelId)
            : $this->default_selling_price_ht;

        if (!$basePrice) {
            return 0;
        }

        $discount = $this->getQuantityDiscount($quantity);
        if (!$discount) {
            return $basePrice;
        }

        if ($discount->discount_percentage) {
            return $basePrice * (1 - $discount->discount_percentage / 100);
        }

        return max(0, $basePrice - $discount->discount_per_unit);
    }
}
