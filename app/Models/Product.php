<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;

#[Cacheable]
class Product extends Model
{
    use HasCompany,
        HasStandardizedConfiguration,
        SoftDeletes,
        Auditable,
        HasTenantSlug,
        HasTenantRouteBinding;

    protected $table = 'products';

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'ref',
        'barcode',
        'description',
        'family_id',
        'brand_id',
        'product_type_id',
        'tva_id',
        'unit_id',
        'purchase_price_ht',
        'current_cost_price',
        'min_margin_percentage',
        'manages_stock',
        'allow_negative_stock',
        'has_lots',
        'has_expiration_date',
        'min_stock_alert',
        'max_stock_alert',
        'manages_quantity_discounts',
        'valuation_method_id',
        'weight',
        'volume',
        'length',
        'width',
        'height',
        'specifications',
        'images',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'active',
    ];

    protected $casts = [
        'specifications' => 'array',
        'images' => 'array',
        'meta_keywords' => 'array',
        'active' => 'boolean',
        'manages_stock' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'has_lots' => 'boolean',
        'has_expiration_date' => 'boolean',
        'manages_quantity_discounts' => 'boolean',
        'purchase_price_ht' => 'decimal:4',
        'current_cost_price' => 'decimal:4',
        'min_margin_percentage' => 'decimal:4',
        'min_stock_alert' => 'decimal:4',
        'max_stock_alert' => 'decimal:4',
        'weight' => 'decimal:2',
        'volume' => 'decimal:2',
        'length' => 'decimal:2',
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['is_low_stock'];

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
        'active'
    ];
    public static array $sortable = ['id', 'name', 'ref', 'purchase_price_ht', 'created_at', 'updated_at'];
    public static array $defaultWith = [];
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
        'barcodes',
        'primaryBarcode'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['products'];


    // Relations
    // app/Models/Product.php — أضف هذه الدالة

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
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
    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class);
    }
    public function primaryBarcode(): HasOne
    {
        return $this->hasOne(Barcode::class)->where('is_primary', true);
    }
    public function packagings(): HasMany
    {
        return $this->hasMany(ProductPackaging::class)->orderBy('display_order');
    }
    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }
    public function quantityDiscounts(): HasMany
    {
        return $this->hasMany(QuantityDiscount::class)->orderBy('price_level_id')->orderBy('tier_order');
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

    // Scopes
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
            StockMovement::selectRaw('COALESCE(stock_balance_after, 0)')
                ->whereColumn('product_id', 'products.id')
                ->latest('movement_date')->latest('id')->limit(1)
        );
    }

    // Accessors

    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) return false;
        return (float) ($this->attributes['current_stock'] ?? 0)
            <= (float) $this->min_stock_alert;
    }

    // Business Logic
    public function computedPrice(int $priceLevelId): float
    {
        $pp = $this->prices()->where('price_level_id', $priceLevelId)->where('active', true)->first();
        if (!$pp) return 0.0;
        return $pp->computePrice((float) $this->purchase_price_ht);
    }

    public function priceForPackaging(int $priceLevelId, int $packagingId): float
    {
        $unitPrice = $this->computedPrice($priceLevelId);
        if (!$unitPrice) return 0.0;
        $packaging = $this->packagings()->find($packagingId);
        return $packaging ? round($unitPrice * (float) $packaging->quantity, 4) : $unitPrice;
    }

    public function applicableDiscount(int $priceLevelId, float $qty): ?QuantityDiscount
    {
        if (!$this->manages_quantity_discounts) return null;
        return $this->quantityDiscounts()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->where('is_blocked', false)
            ->where('min_qty', '<=', $qty)
            ->where(fn($q) => $q->whereNull('max_qty')->orWhere('max_qty', '>=', $qty))
            ->orderBy('tier_order')
            ->first();
    }

    public function finalPrice(int $priceLevelId, float $qty = 1, ?int $packagingId = null): float
    {
        $basePrice = $packagingId ? $this->priceForPackaging($priceLevelId, $packagingId) : $this->computedPrice($priceLevelId);
        if (!$basePrice) return 0.0;
        $discount = $this->applicableDiscount($priceLevelId, $qty);
        if (!$discount) return $basePrice;
        return $discount->calculateDiscountedPrice($basePrice);
    }

    public function defaultPackaging(): ?ProductPackaging
    {
        return $this->packagings()->where('is_default', true)->first()
            ?? $this->packagings()->orderBy('quantity')->first();
    }

    public function stockOnDate(int $warehouseId, string $date, bool $includeUnvalidated = false): float
    {
        $query = $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->where('movement_date', '<=', $date);
        if (!$includeUnvalidated) $query->where('is_validated', true);
        return $query->get()->sum(fn($mov) => $mov->stockMovementType->direction * $mov->quantity);
    }

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
        foreach ($movements as $mov) {
            $direction = $mov->stockMovementType->direction;
            $quantity = $direction * $mov->quantity;
            if ($quantity > 0) {
                $totalValue += $mov->quantity * $mov->unit_price;
                $totalQuantity += $mov->quantity;
            } else {
                $currentPMP = $totalQuantity > 0 ? $totalValue / $totalQuantity : 0;
                $outValue = abs($quantity) * $currentPMP;
                $totalValue -= $outValue;
                $totalQuantity += $quantity;
            }
        }
        return $totalQuantity > 0 ? round($totalValue / $totalQuantity, 4) : 0;
    }
}
