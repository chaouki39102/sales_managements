<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Product — النموذج الموحد (منتج + SKU في جدول واحد)
 *
 * العلاقات:
 *   packagings       → product_packagings   (Colisages)
 *   prices           → product_prices       (Tarifs)
 *   quantityDiscounts→ quantity_discounts   (Tx Remise)
 *   stockMovements   → stock_movements
 *   lots             → product_lots
 *   documentLines    → commercial_document_lines
 *   openingBalances  → opening_balances_stock
 */
#[Cacheable]
class Product extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, Auditable;

    protected $table = 'products';

    protected $fillable = [
        // معلومات أساسية
        'name',
        'slug',
        'ref',
        'barcode',
        'description',

        // تصنيف
        'family_id',
        'brand_id',
        'product_type_id',

        // ضريبة ووحدة
        'tva_id',
        'unit_id',

        // تسعير
        'purchase_price_ht',

        // مخزون
        'manages_stock',
        'allow_negative_stock',
        'has_lots',
        'has_expiration_date',
        'min_stock_alert',
        'max_stock_alert',
        'manages_quantity_discounts',

        // تقييم المخزون
        'valuation_method_id',

        // أبعاد
        'weight',
        'volume',
        'length',
        'width',
        'height',

        // بيانات مرنة
        'specifications',
        'images',
        'meta_title',
        'meta_description',
        'meta_keywords',

        'active',
    ];

    protected $casts = [
        'specifications'             => 'array',
        'images'                     => 'array',
        'meta_keywords'              => 'array',
        'active'                     => 'boolean',
        'manages_stock'              => 'boolean',
        'allow_negative_stock'       => 'boolean',
        'has_lots'                   => 'boolean',
        'has_expiration_date'        => 'boolean',
        'manages_quantity_discounts' => 'boolean',
        'purchase_price_ht'          => 'decimal:4',
        'min_stock_alert'            => 'decimal:4',
        'max_stock_alert'            => 'decimal:4',
        'weight'                     => 'decimal:2',
        'volume'                     => 'decimal:2',
        'length'                     => 'decimal:2',
        'width'                      => 'decimal:2',
        'height'                     => 'decimal:2',
        'created_at'                 => 'datetime',
        'updated_at'                 => 'datetime',
        'deleted_at'                 => 'datetime',
    ];

    protected $appends = ['current_stock', 'is_low_stock'];

    // ── Configuration ──

    public static array $searchableFields = ['name', 'ref', 'barcode', 'description'];

    public static array $filterable = [
        'family_id',
        'brand_id',
        'product_type_id',
        'tva_id',
        'unit_id',
        'valuation_method_id',
        'manages_stock',
        'has_lots',
        'has_expiration_date',
        'manages_quantity_discounts',
        'active',
    ];

    public static array $sortable = [
        'id',
        'name',
        'ref',
        'purchase_price_ht',
        'created_at',
        'updated_at',
    ];

    public static array $defaultWith  = [];
    public static array $allowedIncludes = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
        'valuationMethod',
        'packagings',
        'prices',
        'prices.priceLevel',
        'quantityDiscounts',
        'quantityDiscounts.priceLevel',
        'stockMovements',
        'lots',
        'documentLines',
        'openingBalances',
    ];

    public static string $defaultSort          = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int    $defaultPerPage        = 15;
    public static int    $perPageLimit          = 100;
    public static ?int   $cacheTtl              = 300;
    public static array  $cacheTags             = ['products'];

    // ── Relations ──

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function productType(): BelongsTo
    {
        return $this->belongsTo(ProductType::class);
    }

    public function tva(): BelongsTo
    {
        return $this->belongsTo(Tva::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function valuationMethod(): BelongsTo
    {
        return $this->belongsTo(InventoryValuationMethod::class, 'valuation_method_id');
    }

    /** Colisages — وحدات التعبئة */
    public function packagings(): HasMany
    {
        return $this->hasMany(ProductPackaging::class)->orderBy('display_order');
    }

    /** Tarifs — مستويات الأسعار */
    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    /** Tx Remise — تخفيضات الكميات */
    public function quantityDiscounts(): HasMany
    {
        return $this->hasMany(QuantityDiscount::class)
            ->orderBy('price_level_id')
            ->orderBy('tier_order');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function documentLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }

    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceStock::class);
    }

    // ── Scopes ──

    public function scopeByFamily(Builder $q, int $familyId): Builder
    {
        return $q->where('family_id', $familyId);
    }

    public function scopeByBrand(Builder $q, int $brandId): Builder
    {
        return $q->where('brand_id', $brandId);
    }

    public function scopeManagesStock(Builder $q): Builder
    {
        return $q->where('manages_stock', true);
    }

    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereColumn(
            'min_stock_alert',
            '>=',
            // subquery: آخر stock_balance_after لهذا المنتج
            StockMovement::selectRaw('COALESCE(stock_balance_after, 0)')
                ->whereColumn('product_id', 'products.id')
                ->latest('movement_date')
                ->latest('id')
                ->limit(1)
                ->getQuery()
        );
    }

    // ── Accessors ──

    public function getCurrentStockAttribute(): float
    {
        return (float) ($this->stockMovements()
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0);
    }

    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) return false;
        return $this->current_stock <= (float) $this->min_stock_alert;
    }

    // ── Business Logic ──

    /**
     * حساب سعر البيع HT لمستوى سعر معين
     * (بدون price_computed في DB — الحساب يتم هنا)
     */
    public function computedPrice(int $priceLevelId): float
    {
        $pp = $this->prices()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->first();

        if (!$pp) return 0.0;

        return $pp->computePrice((float) $this->purchase_price_ht);
    }

    /**
     * سعر البيع مع التعبئة
     * سعر الفاردو = سعر الوحدة × معامل التعبئة
     */
    public function priceForPackaging(int $priceLevelId, int $packagingId): float
    {
        $unitPrice = $this->computedPrice($priceLevelId);
        if (!$unitPrice) return 0.0;

        $packaging = $this->packagings()->find($packagingId);
        return $packaging
            ? round($unitPrice * (float) $packaging->quantity, 4)
            : $unitPrice;
    }

    /**
     * التخفيض المنطبق على كمية لتعريفة معينة
     */
    public function applicableDiscount(int $priceLevelId, float $qty): ?QuantityDiscount
    {
        if (!$this->manages_quantity_discounts) return null;

        return $this->quantityDiscounts()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->where('is_blocked', false)
            ->where('min_qty', '<=', $qty)
            ->where(function ($q) use ($qty) {
                $q->whereNull('max_qty')->orWhere('max_qty', '>=', $qty);
            })
            ->orderBy('tier_order')
            ->first();
    }

    /**
     * السعر النهائي بعد تطبيق خصم الكمية
     */
    public function finalPrice(int $priceLevelId, float $qty = 1, ?int $packagingId = null): float
    {
        $basePrice = $packagingId
            ? $this->priceForPackaging($priceLevelId, $packagingId)
            : $this->computedPrice($priceLevelId);

        if (!$basePrice) return 0.0;

        $discount = $this->applicableDiscount($priceLevelId, $qty);
        if (!$discount) return $basePrice;

        return $discount->calculateDiscountedPrice($basePrice);
    }

    /**
     * الوحدة الأساسية (is_default أو الأصغر quantity)
     */
    public function defaultPackaging(): ?ProductPackaging
    {
        return $this->packagings()
            ->where('is_default', true)
            ->first()
            ?? $this->packagings()->orderBy('quantity')->first();
    }

    // app/Models/Product.php

    /**
     * حساب كمية المخزون في تاريخ محدد
     */
    public function stockOnDate(int $warehouseId, string $date, bool $includeUnvalidated = false): float
    {
        $query = $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->where('movement_date', '<=', $date);

        if (!$includeUnvalidated) {
            $query->where('is_validated', true);
        }

        return $query->get()->sum(function ($movement) {
            $direction = $movement->stockMovementType->direction;
            return $direction * $movement->quantity;
        });
    }

    /**
     * الحصول على سعر التكلفة (PMP) في تاريخ محدد
     */
    public function costPriceOnDate(int $warehouseId, string $date): float
    {
        $movements = $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->where('is_validated', true)
            ->where('movement_date', '<=', $date)
            ->orderBy('movement_date')
            ->get();

        $totalValue = 0;
        $totalQuantity = 0;

        foreach ($movements as $movement) {
            $direction = $movement->stockMovementType->direction;
            $quantity = $direction * $movement->quantity;

            if ($quantity > 0) {
                // إدخال: نضيف القيمة والكمية
                $totalValue += $movement->quantity * $movement->unit_price;
                $totalQuantity += $movement->quantity;
            } else {
                // خروج: نطرح من المتوسط المرجح الحالي
                $currentPMP = $totalQuantity > 0 ? $totalValue / $totalQuantity : 0;
                $outValue = abs($quantity) * $currentPMP;
                $totalValue -= $outValue;
                $totalQuantity += $quantity; // quantity سالبة
            }
        }

        return $totalQuantity > 0 ? round($totalValue / $totalQuantity, 4) : 0;
    }

    // ── Boot ──

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
        });

        static::updating(function (Product $product) {
            if ($product->isDirty('name') && !$product->isDirty('slug')) {
                $product->slug = Str::slug($product->name);
            }
        });
    }
}
