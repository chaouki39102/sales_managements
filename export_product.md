# Module Export: product
Generated at: 2026-07-24 09:15:26

## Models

### 📁 C:\xampp\htdocs\sales_managements\app\Models\PosSessionProduct.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSessionProduct extends Model
{
    protected $fillable = ['pos_session_id', 'product_id', 'product_name', 'quantity_sold', 'total_ht', 'total_ttc'];
    protected $casts    = ['quantity_sold' => 'decimal:3', 'total_ht' => 'decimal:2', 'total_ttc' => 'decimal:2'];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\Product.php
```php
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
use App\Core\Traits\AuditableEnhanced;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;

#[Cacheable]
class Product extends Model
{
    use HasCompany,
        HasStandardizedConfiguration,
        SoftDeletes,
        AuditableEnhanced,
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
        'is_subsidized',
        'regulated_product_config_id',
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
        'is_subsidized' => 'boolean',
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

    protected $appends = ['is_low_stock', 'default_selling_price_ht'];

    public static array $searchableFields = ['name', 'ref', 'barcode', 'description'];
    /** الحقول القابلة للبحث بـ FULLTEXT (MySQL فقط) */
    public static array $fulltextFields = ['name', 'description'];
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
        'active' => ['type' => 'boolean']
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
        'primaryBarcode',
        'regulatedProductConfig'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 2000;
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
    public function regulatedProductConfig(): BelongsTo
    {
        return $this->belongsTo(RegulatedProductConfig::class);
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

    public function getDefaultSellingPriceHtAttribute(): float
    {
        if ($this->relationLoaded('prices')) {
            $active = $this->prices->first(fn($p) => $p->active);
            if ($active) {
                $price = $active->computePrice((float) ($this->purchase_price_ht ?? $this->current_cost_price ?? 0));
                if ($price > 0) return round($price, 4);
            }
        }
        // Fallback: purchase_price_ht × 1.3
        $base = (float) ($this->purchase_price_ht ?? $this->current_cost_price ?? 0);
        return $base > 0 ? round($base * 1.3, 4) : 0;
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

```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\ProductLot.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ProductLot extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes;

    protected $table = 'product_lots';

    protected $fillable = [
        'company_id',
        'lot_number',
        'product_id',
        'warehouse_id',
        'manufacturing_date',
        'expiration_date',
        'purchase_date',
        'purchase_price',
        'legal_selling_price',
        'margin_percentage',
        'original_quantity',
        'remaining_quantity',
        'stock_movement_id',
        'supplier_lot_number',
        'active',
    ];

    protected $casts = [
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:4',
        'legal_selling_price' => 'decimal:4',
        'margin_percentage' => 'decimal:4',
        'original_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['is_depleted', 'is_expired'];

    public static array $searchableFields = ['lot_number', 'supplier_lot_number'];
    public static array $filterable = ['product_id', 'warehouse_id', 'active'];
    public static array $sortable = ['id', 'lot_number', 'purchase_date', 'expiration_date', 'remaining_quantity', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['product', 'warehouse', 'stockMovement', 'commercialDocumentLines', 'stockMovements'];
    public static string $defaultSort = 'purchase_date';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 20;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_lots'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function stockMovement(): BelongsTo { return $this->belongsTo(StockMovement::class); }
    public function commercialDocumentLines() { return $this->hasMany(CommercialDocumentLine::class, 'stock_lot_id'); }
    public function stockMovements() { return $this->hasMany(StockMovement::class, 'stock_lot_id'); }

    public function scopeAvailable(Builder $query): Builder { return $query->where('remaining_quantity', '>', 0)->where('active', true); }
    public function scopeDepleted(Builder $query): Builder { return $query->where('remaining_quantity', '<=', 0); }
    public function scopeExpired(Builder $query): Builder { return $query->whereNotNull('expiration_date')->where('expiration_date', '<', now()); }
    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereNotNull('expiration_date')->whereBetween('expiration_date', [now(), now()->addDays($days)]);
    }
    public function scopeFifoOrder(Builder $query): Builder { return $query->orderBy('purchase_date')->orderBy('id'); }

    public function getIsDepletedAttribute(): bool { return $this->remaining_quantity <= 0; }
    public function getIsExpiredAttribute(): bool { return $this->expiration_date && $this->expiration_date->isPast(); }
    public function getTotalCostAttribute(): float { return $this->original_quantity * $this->purchase_price; }
    public function getRemainingValueAttribute(): float { return $this->remaining_quantity * $this->purchase_price; }

    public function decreaseQuantity(float $quantity): bool
    {
        if ($this->remaining_quantity < $quantity) return false;
        return $this->decrement('remaining_quantity', $quantity);
    }
    public function increaseQuantity(float $quantity): bool { return $this->increment('remaining_quantity', $quantity); }
    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiration_date && $this->expiration_date->isFuture() && $this->expiration_date->diffInDays(now()) <= $days;
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\ProductPackaging.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class ProductPackaging extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_packagings';

    protected $fillable = [
        'company_id',
        'product_id',
        'code',
        'label',
        'quantity',
        'barcode',
        'is_default',
        'active',
        'display_order',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'is_default' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['code', 'label', 'barcode'];
    public static array $filterable = ['product_id', 'active', 'is_default'];
    public static array $sortable = ['id', 'display_order', 'quantity'];
    public static array $allowedIncludes = ['product'];
    public static string $defaultSort = 'display_order';
    public static array $cacheTags = ['product_packagings', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceForLevel(int $priceLevelId): float
    {
        $unitPrice = $this->product->computedPrice($priceLevelId);
        return round($unitPrice * (float) $this->quantity, 4);
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\ProductPrice.php
```php
<?php

namespace App\Models;

use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_prices';

    protected $fillable = [
        'company_id',
        'product_id',
        'price_level_id',
        'pricing_method',
        'price',
        'rate',
        'margin',
        'active',
    ];

    protected $casts = [
        'price' => 'decimal:4',
        'rate' => 'decimal:4',
        'margin' => 'decimal:4',
        'active' => 'boolean',
    ];

    public static array $filterable = ['product_id', 'price_level_id', 'active', 'pricing_method'];
    public static array $sortable = ['id', 'price_level_id'];
    public static array $allowedIncludes = ['product', 'priceLevel'];
    public static string $defaultSort = 'price_level_id';
    public static array $cacheTags = ['product_prices', 'products'];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function priceLevel(): BelongsTo { return $this->belongsTo(PriceLevel::class); }

    public function computePrice(float $purchasePriceHt): float
    {
        return match ($this->pricing_method) {
            'rate'   => round($purchasePriceHt * (1 + ((float)($this->rate ?? 0)) / 100), 4),
            'margin' => round($purchasePriceHt + ((float)($this->margin ?? 0)), 4),
            default  => round((float)($this->price ?? 0), 4),
        };
    }

    public function computedMargin(float $purchasePriceHt): float
    {
        return round($this->computePrice($purchasePriceHt) - $purchasePriceHt, 4);
    }

    public function computedRate(float $purchasePriceHt): float
    {
        if (!$purchasePriceHt) return 0.0;
        return round((($this->computePrice($purchasePriceHt) / $purchasePriceHt) - 1) * 100, 4);
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\ProductType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ProductType extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'product_types';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'description',
        'manages_stock',
        'active',
        'display_order',
    ];

    protected $casts = [
        'manages_stock' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active', 'manages_stock'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['product_types', 'lookups'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\ProductVariant.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes, HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_variants';

    protected $fillable = [
        'company_id',
        'product_id',
        'sku',
        'barcode',
        'price_type',
        'price_value',
        'stock',
        'track_stock',
        'attributes',
        'image',
        'weight',
        'volume',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'price_value' => 'decimal:4',
        'stock' => 'decimal:4',
        'track_stock' => 'boolean',
        'attributes' => 'array',
        'weight' => 'decimal:2',
        'volume' => 'decimal:2',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['sku', 'barcode', 'attributes'];
    public static array $filterable = ['product_id', 'price_type', 'active', 'track_stock'];
    public static array $sortable = ['id', 'sku', 'price_value', 'stock', 'created_at'];
    public static array $defaultWith = ['product:id,name,ref'];
    public static array $allowedIncludes = ['product', 'company', 'barcodes'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_variants'];

    public function company() { return $this->belongsTo(Company::class); }
    public function product() { return $this->belongsTo(Product::class); }
    public function barcodes() { return $this->hasMany(Barcode::class); }

    public function getFinalPriceAttribute(): ?float
    {
        if (!$this->product || !$this->price_type) {
            return $this->product?->purchase_price_ht ?? null;
        }
        $basePrice = $this->product->purchase_price_ht ?? 0;
        if ($this->price_type === 'fixed') {
            return $basePrice + ($this->price_value ?? 0);
        }
        if ($this->price_type === 'percentage') {
            return $basePrice * (1 + ($this->price_value / 100));
        }
        return $basePrice;
    }

    public function getIsInStockAttribute(): bool
    {
        if ($this->track_stock === false) return true;
        return ($this->stock ?? 0) > 0;
    }

    protected static function booted(): void
    {
        static::creating(function ($variant) {
            if (empty($variant->active)) $variant->active = true;
            if ($variant->track_stock === null) $variant->track_stock = true;
        });
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\RegulatedProductConfig.php
```php
<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegulatedProductConfig extends Model
{
    use HasCompany;

    protected $table = 'regulated_products_config';

    protected $fillable = [
        'company_id',
        'product_key',
        'label',
        'unit_label',
        'category',
        'regulated_max_price',
        'regulated_margin',
        'regulation_type',
        'legal_reference',
        'effective_date',
        'active',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'regulated_max_price' => 'decimal:4',
        'regulated_margin'    => 'decimal:4',
        'effective_date'      => 'date',
        'active'              => 'boolean',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

```

## Controllers

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\ProductController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends BaseApiController
{
    protected string $resourceName = 'product';
    protected ?string $resourceClass = ProductResource::class;

    public function __construct(private ProductService $productService)
    {
        parent::__construct();
    }

    // ========== دوال إضافية فقط (غير موجودة في BaseApiController) ==========

    public function active(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getActiveProducts();
            return $this->successResponse(ProductResource::collection($products), 'تم جلب المنتجات النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    public function byFamily(Request $request, int $familyId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByFamily($familyId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byFamily');
        }
    }

    public function byBrand(Request $request, int $brandId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByBrand($brandId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byBrand');
        }
    }

    /**
     * بحث صور من مزود خارجي (Pexels) — لميزة "اقتراح صورة" في مودل المنتج.
     * القراءة فقط، بدون أي كتابة على المنتج؛ الإضافة الفعلية تتم من الواجهة
     * عبر تحديث حقل images الاعتيادي (update).
     */
    public function imageSearch(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $validated = $request->validate([
                'query'   => 'required|string|min:2|max:100',
                'page'    => 'nullable|integer|min:1|max:10',
                'barcode' => 'nullable|string|max:50',
            ]);

            $results = $this->productService->searchProductImages(
                $validated['query'],
                (int) ($validated['page'] ?? 1),
                $validated['barcode'] ?? null,
            );

            return $this->successResponse($results, 'تم جلب نتائج البحث عن الصور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'imageSearch');
        }
    }

    // ========== تجاوز الإعدادات الخاصة بالقائمة ==========

    protected function getListConfig(): array
    {
        return [
            'search_fields'   => Product::$searchableFields,
            'filters'         => Product::$filterable,
            'sorts'           => Product::$sortable,
            'relations'       => Product::$allowedIncludes,
            'default_includes'=> ['family', 'brand', 'productType', 'packagings'],
            'default_sort'    => Product::$defaultSort,
            'default_per_page'=> Product::$defaultPerPage ?? 15,
            'per_page_limit'  => Product::$perPageLimit ?? 100,
            'cache_tags'      => ['products'],

        ];
    }

    // ========== الإجباريات لـ BaseApiController ==========

    protected function getService(): ProductService
    {
        return $this->productService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\ProductLookupsController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Brand;
use App\Models\Unit;
use App\Models\Tva;
use App\Models\PriceLevel;
use App\Models\ProductType;
use App\Models\InventoryValuationMethod;
use App\Models\RegulatedProductConfig;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;

class ProductLookupsController extends Controller
{
    public function index(CompanyContextService $ctx): JsonResponse
    {
        $companyId = $ctx->get();

        $data = [
            'families'          => Family::select('id', 'name', 'slug', 'description', 'active')->where('active', true)->orderBy('name')->get(),
            'brands'            => Brand::select('id', 'name', 'slug', 'active')->where('active', true)->orderBy('name')->get(),
            'units'             => Unit::select('id', 'name', 'symbol', 'active')->where('active', true)->orderBy('name')->get(),
            'tvas'              => Tva::select('id', 'name', 'rate', 'is_default', 'active')->where('active', true)->orderBy('rate')->get(),
            'priceLevels'       => PriceLevel::select('id', 'name', 'code', 'active')->where('active', true)->orderBy('name')->get(),
            'productTypes'      => ProductType::select('id', 'name', 'active')->where('active', true)->orderBy('name')->get(),
            'valuationMethods'  => InventoryValuationMethod::select('id', 'name', 'code', 'active')->where('active', true)->orderBy('name')->get(),
            'regulatedProducts' => RegulatedProductConfig::select('id', 'product_key', 'label', 'unit_label', 'category', 'regulated_max_price', 'active')->where('active', true)->orderBy('label')->get(),
        ];

        return response()->json([
            'status'  => 'success',
            'message' => 'تم بنجاح',
            'data'    => $data,
        ]);
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\ProductLotController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductLotResource;
use App\Services\ProductLotService;
use App\Models\ProductLot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductLotController extends BaseApiController
{
    protected string $resourceName = 'product_lot';
    protected ?string $resourceClass = ProductLotResource::class;

    public function __construct(private ProductLotService $service)
    {
        parent::__construct();
    }

    public function available(Request $request): JsonResponse
    {
        try {
            $lots = $this->service->getAvailable();
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات المتاحة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'available');
        }
    }

    public function expiring(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);
            $lots = $this->service->getExpiringSoon($days);
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات قريبة الانتهاء بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'expiring');
        }
    }

    protected function getService(): ProductLotService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductLot::class;
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\ProductTypeController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductTypeResource;
use App\Services\ProductTypeService;
use App\Models\ProductType;

class ProductTypeController extends BaseApiController
{
    protected string $resourceName = 'product_type';
    protected ?string $resourceClass = ProductTypeResource::class;

    public function __construct(private ProductTypeService $productTypeService)
    {
        parent::__construct();
    }

    protected function getService(): ProductTypeService
    {
        return $this->productTypeService;
    }

    protected function getModelClass(): string
    {
        return ProductType::class;
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\ProductVariantController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreProductVariantRequest;
use App\Http\Requests\UpdateProductVariantRequest;
use App\Http\Resources\ProductVariantResource;
use App\Models\ProductVariant;
use App\Services\ProductVariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantController extends BaseApiController
{
    protected string $resourceName = 'product_variant';
    protected ?string $resourceClass = ProductVariantResource::class;

    public function __construct(private ProductVariantService $service)
    {
        parent::__construct();
    }

    protected function getService(): ProductVariantService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductVariant::class;
    }

    // ملاحظة: تم إزالة index و show و destroy لأن BaseApiController
    // يقوم بالمهمة تلقائياً وبنفس المنطق الذي كتبته، إلا إذا أردت تخصيصاً شديداً.

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', $this->getModelClass());

            // تصحيح: استخدام الـ FormRequest يدوياً للحصول على البيانات المفلترة والتوافق مع الأب
            $validatedData = app(StoreProductVariantRequest::class)->validated();

            $variant = $this->service->create($validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم إنشاء المتغير بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('update', $variant);

            // تصحيح: استخدام الـ FormRequest يدوياً
            $validatedData = app(UpdateProductVariantRequest::class)->validated();

            $variant = $this->service->update($variant, $validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم تحديث المتغير'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function indexByProduct(Request $request, $productId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', ProductVariant::class);
            $data = $this->apiListWithCallback(
                ProductVariant::class,
                fn($query) => $query->where('product_id', $productId),
                $request,
                $this->getListConfig()
            );
            return $this->successResponse($data, 'تم جلب متغيرات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\RegulatedProductsController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\RegulatedProductsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RegulatedProductsController extends Controller
{
    public function __construct(
        private readonly RegulatedProductsService $regulatedProductsService,
    ) {}

    public function index(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $activeOnly = $request->boolean('active_only', true);
            $products   = $this->regulatedProductsService->getList($company->id, $activeOnly);

            return response()->json([
                'status' => 'success',
                'data'   => $products,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'product_key'        => 'required|string|max:80',
                'label'              => 'required|string|max:200',
                'unit_label'         => 'required|string|max:50',
                'category'           => 'required|string|max:50',
                'regulated_max_price'=> 'required|numeric|min:0',
                'regulated_margin'   => 'nullable|numeric|min:0',
                'regulation_type'    => 'string|in:price,margin',
                'legal_reference'    => 'nullable|string|max:255',
                'effective_date'     => 'nullable|date',
                'active'             => 'boolean',
                'notes'              => 'nullable|string|max:500',
            ]);

            $product = $this->regulatedProductsService->create(
                $company->id,
                $validated,
                auth()->id(),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تمت إضافة المادة المقنَّنة بنجاح',
                'data'    => $product,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'product_key'        => 'sometimes|string|max:80',
                'label'              => 'sometimes|string|max:200',
                'unit_label'         => 'sometimes|string|max:50',
                'category'           => 'sometimes|string|max:50',
                'regulated_max_price'=> 'sometimes|numeric|min:0',
                'regulated_margin'   => 'nullable|numeric|min:0',
                'regulation_type'    => 'sometimes|string|in:price,margin',
                'legal_reference'    => 'nullable|string|max:255',
                'effective_date'     => 'nullable|date',
                'active'             => 'boolean',
                'notes'              => 'nullable|string|max:500',
            ]);

            $product = $this->regulatedProductsService->update($id, $validated, auth()->id());

            return response()->json([
                'status'  => 'success',
                'message' => 'تم تحديث المادة المقنَّنة بنجاح',
                'data'    => $product,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function toggle(Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $product = $this->regulatedProductsService->toggle($id);

            return response()->json([
                'status'  => 'success',
                'message' => $product->active ? 'تم تفعيل المادة' : 'تم تعطيل المادة',
                'data'    => $product,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $this->regulatedProductsService->delete($id);

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حذف المادة المقنَّنة',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function seedDefaults(Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $this->regulatedProductsService->seedDefaults($company->id);

            return response()->json([
                'status'  => 'success',
                'message' => 'تمت استعادة القائمة الافتراضية للمواد المقنَّنة',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

```

## Services

### 📁 C:\xampp\htdocs\sales_managements\app\Services\Fiscal\RegulatedProductsService.php
```php
<?php

namespace App\Services\Fiscal;

use App\Models\RegulatedProductConfig;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegulatedProductsService
{
    public function getList(int $companyId, bool $activeOnly = true): Collection
    {
        $query = RegulatedProductConfig::forCompany($companyId);

        if ($activeOnly) {
            $query->where('active', true);
        }

        return $query->orderBy('category')->orderBy('label')->get();
    }

    public function create(int $companyId, array $data, int $userId): RegulatedProductConfig
    {
        $data['company_id'] = $companyId;
        $data['updated_by'] = $userId;

        return RegulatedProductConfig::create($data);
    }

    public function update(int $id, array $data, int $userId): RegulatedProductConfig
    {
        $config = RegulatedProductConfig::findOrFail($id);
        $data['updated_by'] = $userId;
        $config->update($data);

        return $config->fresh();
    }

    public function toggle(int $id): RegulatedProductConfig
    {
        $config = RegulatedProductConfig::findOrFail($id);
        $config->update(['active' => !$config->active]);

        return $config->fresh();
    }

    public function delete(int $id): void
    {
        RegulatedProductConfig::findOrFail($id)->delete();
    }

    public function seedDefaults(int $companyId): void
    {
        $defaults = $this->getDefaults();
        $now = now();

        $rows = [];
        foreach ($defaults as $d) {
            $rows[] = [
                'company_id'          => $companyId,
                'product_key'         => $d['key'],
                'label'               => $d['label'],
                'unit_label'          => $d['unit'],
                'category'            => $d['cat'],
                'regulated_max_price' => $d['max_price'],
                'regulation_type'     => 'price',
                'legal_reference'     => $d['ref'],
                'active'              => true,
                'created_at'          => $now,
                'updated_at'          => $now,
            ];
        }

        foreach ($rows as $row) {
            RegulatedProductConfig::forCompany($companyId)->updateOrCreate(
                ['product_key' => $row['product_key']],
                $row,
            );
        }

        Log::info("RegulatedProductsService: تمت استعادة القائمة الافتراضية للشركة {$companyId}");
    }

    public function getDefaults(): array
    {
        return [
            ['key'=>'huile_5L',     'label'=>'زيت مائدة مدعم 5ل',  'unit'=>'عبوة 5ل',   'cat'=>'huile',  'max_price'=>650.00,  'ref'=>'م.ت 20-241 بتاريخ 31/08/2020'],
            ['key'=>'huile_2L',     'label'=>'زيت مائدة مدعم 2ل',  'unit'=>'عبوة 2ل',   'cat'=>'huile',  'max_price'=>250.00,  'ref'=>'م.ت 20-241'],
            ['key'=>'huile_1L',     'label'=>'زيت مائدة مدعم 1ل',  'unit'=>'عبوة 1ل',   'cat'=>'huile',  'max_price'=>125.00,  'ref'=>'م.ت 20-241'],
            ['key'=>'semoul_fin_1', 'label'=>'سميد ناعم 1كغ',       'unit'=>'كغ',         'cat'=>'semoul', 'max_price'=>42.50,   'ref'=>'م.ت 07-402 معدَّل بـ 20-242'],
            ['key'=>'semoul_ord_1', 'label'=>'سميد عادي 1كغ',       'unit'=>'كغ',         'cat'=>'semoul', 'max_price'=>38.50,   'ref'=>'م.ت 07-402 معدَّل بـ 20-242'],
            ['key'=>'semoul_fin_2', 'label'=>'سميد ناعم 2كغ',       'unit'=>'كيس 2كغ',   'cat'=>'semoul', 'max_price'=>84.00,   'ref'=>'م.ت 07-402'],
            ['key'=>'semoul_ord_2', 'label'=>'سميد عادي 2كغ',       'unit'=>'كيس 2كغ',   'cat'=>'semoul', 'max_price'=>76.00,   'ref'=>'م.ت 07-402'],
            ['key'=>'semoul_10',    'label'=>'سميد 10كغ',           'unit'=>'كيس 10كغ',  'cat'=>'semoul', 'max_price'=>410.00,  'ref'=>'م.ت 07-402'],
            ['key'=>'farine_1',     'label'=>'فرينة 1كغ',           'unit'=>'كغ',         'cat'=>'farine', 'max_price'=>27.50,   'ref'=>'م.ت 96-132 معدَّل'],
            ['key'=>'farine_2',     'label'=>'فرينة 2كغ',           'unit'=>'كيس 2كغ',   'cat'=>'farine', 'max_price'=>51.50,   'ref'=>'م.ت 96-132'],
            ['key'=>'farine_5',     'label'=>'فرينة 5كغ',           'unit'=>'كيس 5كغ',   'cat'=>'farine', 'max_price'=>133.50,  'ref'=>'م.ت 96-132'],
            ['key'=>'farine_10',    'label'=>'فرينة 10كغ',          'unit'=>'كيس 10كغ',  'cat'=>'farine', 'max_price'=>247.00,  'ref'=>'م.ت 96-132'],
            ['key'=>'lait_sac_1',   'label'=>'حليب أكياس 1ل',       'unit'=>'كيس 1ل',    'cat'=>'lait',   'max_price'=>25.00,   'ref'=>'م.ت 01-50 معدَّل بـ 16-65'],
            ['key'=>'pain_baguette','label'=>'خبز بڤات',            'unit'=>'وحدة',       'cat'=>'pain',   'max_price'=>7.50,    'ref'=>'سعر مقنَّن وزارة التجارة'],
            ['key'=>'cafe_1kg',     'label'=>'قهوة 1كغ',            'unit'=>'كغ',         'cat'=>'cafe',   'max_price'=>1000.00, 'ref'=>'تسقيف وزارة التجارة 2024'],
            ['key'=>'sucre_1kg',    'label'=>'سكر أبيض 1كغ',        'unit'=>'كغ',         'cat'=>'sucre',  'max_price'=>95.00,   'ref'=>'م.ت 20-241'],
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\ProductLotService.php
```php
<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductLot;
use App\Services\CompanyContextService;
use Illuminate\Http\Request;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['lot_number'])) {
            $data['lot_number'] = $this->generateLotNumber((int) ($data['product_id'] ?? 0));
        }

        return $data;
    }

    private function generateLotNumber(int $productId): string
    {
        $companyId = app(CompanyContextService::class)->get();
        $product   = $productId ? Product::find($productId) : null;
        $code      = $product?->ref ?: ($productId ?: 'GEN');
        $datePart  = now()->format('Ymd');

        $seq       = 1;
        $candidate = "LOT-{$code}-{$datePart}-{$seq}";

        while (
            ProductLot::withTrashed()
                ->where('company_id', $companyId)
                ->where('lot_number', $candidate)
                ->exists()
        ) {
            $seq++;
            $candidate = "LOT-{$code}-{$datePart}-{$seq}";
        }

        return $candidate;
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\ProductService.php
```php
<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\ProductPrice;
use App\Models\QuantityDiscount;
use App\Core\Exceptions\BusinessRuleException;
use App\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ProductService extends \App\Core\Services\BaseService
{
    protected string $model        = Product::class;
    protected string $resourceName = 'product';
    protected function getResourceName(): string { return $this->resourceName; }

    protected array $defaultWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
    ];

    protected array $showWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
        'valuationMethod',
        'packagings',
        'prices.priceLevel',
        'quantityDiscounts.priceLevel',
    ];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, $request): array
{
    $data = parent::beforeCreate($data, $request); // ← أضف هذا السطر

    $companyId = app(\App\Services\CompanyContextService::class)->get();
    $company = $companyId ? Company::find($companyId) : null;

    if ($company && $company->products()->count() >= $company->max_products) {
        throw new BusinessRuleException("وصلت الشركة للحد الأقصى من المنتجات ({$company->max_products})", 422);
    }

    return $data;
}

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['packagings'])) {
            $this->syncPackagings($item, $data['packagings']);
        } else {
            $item->packagings()->create([
                'code'          => '1',
                'label'         => 'unite',
                'quantity'      => 1,
                'is_default'    => true,
                'active'        => true,
                'display_order' => 1,
            ]);
        }
        if (!empty($data['prices'])) {
            $this->syncPrices($item, $data['prices'], (float)($data['purchase_price_ht'] ?? 0));
        }
        if (isset($data['quantity_discounts'])) {
            $this->syncDiscounts($item, $data['quantity_discounts'], (bool)($data['manages_quantity_discounts'] ?? false));
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // التخفيف: لا نمنع تعطيل المنتج، فقط نسجل تحذيراً
        if (isset($data['active']) && !(bool)$data['active']) {
            if ($item->stockMovements()->where('is_validated', true)->exists()) {
                Log::warning('محاولة تعطيل منتج له حركات مخزون مؤكدة', [
                    'product_id' => $item->id,
                    'user_id' => auth()->id(),
                ]);
                // يمكنك اختيارياً إضافة رسالة إعلامية للمستخدم عبر session أو استثناء مخصص
                // throw new BusinessRuleException('لا يمكن تعطيل منتج له حركات مخزون مؤكدة', 409);
                // لكننا سنسمح بذلك مع تسجيل التحذير فقط.
            }
        }


    }

    protected function prepareDataForUpdate(Model $item, array $data, $request): array
{
    $data = parent::prepareDataForUpdate($item, $data, $request); // ← أضف
    unset($data['packagings'], $data['prices'], $data['quantity_discounts']);
    return $data;
}

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $packagings = $request?->input('packagings');
        $prices     = $request?->input('prices');
        $discounts  = $request?->input('quantity_discounts');

        if (!is_null($packagings)) {
            $this->syncPackagings($item, $packagings);
        }

        if (!is_null($prices)) {
            $purchasePrice = (float)($request->input('purchase_price_ht') ?? $item->fresh()->purchase_price_ht);
            $this->syncPrices($item, $prices, $purchasePrice);
        }

        if (!is_null($discounts)) {
            $managesDiscounts = (bool)($request->input('manages_quantity_discounts') ?? $item->manages_quantity_discounts);
            $this->syncDiscounts($item, $discounts, $managesDiscounts);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // الحذف الفعلي ممنوع إذا كانت هناك سجلات مرتبطة (يبقى كما هو)
        if ($item->stockMovements()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له حركات مخزون', 409);
        }
        if ($item->lots()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له دفعات مخزون', 409);
        }
        if ($item->documentLines()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج مرتبط بمستندات تجارية', 409);
        }
        if ($item->openingBalances()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له أرصدة افتتاحية', 409);
        }
    }

    // =========================================================
    // Packagings Sync
    // =========================================================

    private function syncPackagings(Product $product, array $data): void
    {
        if (empty($data)) return;

        $incomingIds = collect($data)->pluck('id')->filter()->toArray();

        // حذف التعبئات الغائبة (هذا السلوك قد يكون مقصوداً، لكن يمكن تعديله لتعطيلها بدلاً من الحذف)
        $product->packagings()->whereNotIn('id', $incomingIds)->delete();

        $hasDefault = collect($data)->contains(fn($p) => !empty($p['is_default']));

        foreach ($data as $idx => $pData) {
            $attrs = [
                'code'          => strtoupper(trim($pData['code'])),
                'label'         => trim($pData['label']),
                'quantity'      => isset($pData['quantity']) ? max(0.0001, (float)$pData['quantity']) : 1,
                'barcode'       => $pData['barcode'] ?? null,
                'is_default'    => (bool)($pData['is_default'] ?? false),
                'active'        => (bool)($pData['active'] ?? true),
                'display_order' => (int)($pData['display_order'] ?? $idx),
            ];

            if (!empty($pData['id'])) {
                $product->packagings()->where('id', $pData['id'])->update($attrs);
            } else {
                $product->packagings()->create($attrs);
            }
        }

        if (!$hasDefault) {
            $smallest = $product->packagings()->orderBy('quantity')->first();
            $smallest?->update(['is_default' => true]);
        }
    }

    // =========================================================
    // Prices Sync
    // =========================================================

    private function syncPrices(Product $product, array $data, float $purchasePriceHt): void
    {
        if (empty($data)) return;

        foreach ($data as $pData) {
            if (empty($pData['price_level_id'])) continue;

            $method = $pData['pricing_method'] ?? 'fixed';

            $price  = $method === 'fixed'  ? ((float)($pData['price']  ?? 0)) : null;
            $rate   = $method === 'rate'   ? ((float)($pData['rate']   ?? 0)) : null;
            $margin = $method === 'margin' ? ((float)($pData['margin'] ?? 0)) : null;

            $product->prices()->updateOrCreate(
                ['price_level_id' => (int)$pData['price_level_id']],
                [
                    'pricing_method' => $method,
                    'price'          => $price,
                    'rate'           => $rate,
                    'margin'         => $margin,
                    'active'         => (bool)($pData['active'] ?? true),
                ]
            );
        }
    }

    // =========================================================
    // Discounts Sync — تعديل: لا نحذف، نعطل فقط
    // =========================================================

    private function syncDiscounts(Product $product, array $data, bool $managesDiscounts): void
    {
        if (!$managesDiscounts) {
            // بدلاً من delete()، نعطل الخصومات الحالية
            $product->quantityDiscounts()->update(['active' => false]);
            return;
        }

        // إذا كانت الخصومات مفعلة، نقوم بمزامنتها (ما زلنا نستخدم حذف وإعادة إنشاء للتبسيط)
        // لكن يمكن تحسينها لاحقاً.
        $product->quantityDiscounts()->delete();

        foreach ($data as $idx => $dData) {
            if (empty($dData['price_level_id'])) continue;
            if (!isset($dData['min_qty']) || $dData['min_qty'] === '') continue;
            if (empty($dData['discount_amount']) && empty($dData['discount_percentage'])) continue;

            $product->quantityDiscounts()->create([
                'price_level_id'      => (int)$dData['price_level_id'],
                'min_qty'             => (float)$dData['min_qty'],
                'max_qty'             => isset($dData['max_qty']) && $dData['max_qty'] !== '' ? (float)$dData['max_qty'] : null,
                'discount_amount'     => isset($dData['discount_amount']) && $dData['discount_amount'] !== '' ? (float)$dData['discount_amount'] : null,
                'discount_percentage' => isset($dData['discount_percentage']) && $dData['discount_percentage'] !== '' ? (float)$dData['discount_percentage'] : null,
                'tier_order'          => (int)($dData['tier_order'] ?? $idx + 1),
                'is_blocked'          => (bool)($dData['is_blocked'] ?? false),
                'active'              => (bool)($dData['active'] ?? true),
            ]);
        }
    }

    // =========================================================
    // Public Helpers
    // =========================================================

    public function findById($id, array $with = null): Model
    {
        return $this->model::with($with ?? $this->showWith)->findOrFail($id);
    }

    public function getActiveProducts()
    {
        return $this->model::where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByFamily(int $familyId)
    {
        return $this->model::where('family_id', $familyId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByBrand(int $brandId)
    {
        return $this->model::where('brand_id', $brandId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    // =========================================================
    // Image Search — مصادر متعددة مرتّبة حسب الدقة
    // =========================================================

    /**
     * مواقع جزائرية حقيقية مبنية على WooCommerce — تُستعلم عبر الـ Store API
     * الرسمي والعام (بدون مفتاح، بدون سكرابينغ HTML). هذا API مصمم أصلاً
     * للاستهلاك البرمجي الخارجي، وليس "زحفاً" على الموقع.
     *
     * ملاحظة: موقعا tidjaria وcorailmarket (PrestaShop) غير مُدرجين هنا
     * لأن robots.txt الخاص بهما يمنع الوصول الآلي صراحة، ولأنه لا يوجد
     * API عام موثّق لهما. تغطيتهما تتم فقط عبر Google Custom Search
     * (استعلام لفهرس Google العام، لا يزحف الموقع مباشرة).
     */
    protected array $algerianWooSites = [
        'https://www.taibaoline.com',
        'https://superette-dz.com',
        'https://areej.store',
        'https://shopicornermarket.com',
        'https://topribejaia.com',
    ];

    private function searchAlgerianStores(string $query): array
    {
        $cacheKey = 'dz_stores_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($query) {
            try {
                $responses = Http::pool(fn ($pool) => collect($this->algerianWooSites)
                    ->map(fn ($site) => $pool->as($site)
                        ->timeout(6)
                        ->get(rtrim($site, '/') . '/wp-json/wc/store/v1/products', [
                            'search'   => $query,
                            'per_page' => 6,
                        ])
                    )->all()
                );
            } catch (\Throwable $e) {
                Log::warning('Algerian stores search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            $results = [];
            foreach ($this->algerianWooSites as $site) {
                $response = $responses[$site] ?? null;
                if (!$response instanceof \Illuminate\Http\Client\Response || !$response->successful()) {
                    continue;
                }
                $host = parse_url($site, PHP_URL_HOST);
                foreach ((array) $response->json() as $product) {
                    $images = $product['images'] ?? [];
                    if (empty($images)) continue;
                    $img = $images[0];
                    $full = $img['src'] ?? null;
                    if (!$full) continue;
                    $results[] = [
                        'id'     => 'dz-' . md5($site . ($product['id'] ?? uniqid())),
                        'thumb'  => $img['thumbnail'] ?? $full,
                        'full'   => $full,
                        'source' => $host,
                    ];
                }
            }

            return $results;
        });
    }

    /**
     * Open Food Facts — مطابقة دقيقة بالباركود. مُنقولة إلى الباك-إند لأن
     * world.openfoodfacts.org لا يُرسل رؤوس CORS على مسارات الـ API القديمة
     * (cgi/search.pl)، فيفشل الطلب عند تنفيذه مباشرة من المتصفح.
     * الطلبات من الخادم لا تخضع لسياسة CORS، لذا هذا هو الحل الصحيح.
     */
    private function searchOpenFoodFactsByBarcode(string $barcode): ?array
    {
        $barcode = trim($barcode);
        if ($barcode === '') return null;

        $cacheKey = 'off_barcode:' . md5($barcode);

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($barcode) {
            try {
                $response = Http::withHeaders([
                        // Open Food Facts يشترط User-Agent مميز لتطبيقك
                        'User-Agent' => 'BusinessPlusDZ/1.0 (contact: support@businessplus.dz)',
                    ])
                    ->timeout(6)
                    ->get("https://world.openfoodfacts.org/api/v2/product/{$barcode}.json", [
                        'fields' => 'code,product_name,image_url,image_front_url',
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Open Food Facts barcode lookup failed', ['error' => $e->getMessage(), 'barcode' => $barcode]);
                return null;
            }

            if (!$response->successful() || (int) $response->json('status') !== 1) return null;

            $product = $response->json('product', []);
            $img = $product['image_front_url'] ?? $product['image_url'] ?? null;
            if (!$img) return null;

            return [
                'id'    => 'off-bc-' . ($product['code'] ?? $barcode),
                'thumb' => $img,
                'full'  => $img,
                'exact' => true,
                'label' => 'مطابقة بالباركود',
            ];
        });
    }

    /**
     * Open Food Facts — بحث نصي بالاسم (منتجات حقيقية بصور تعبئتها الفعلية).
     */
    private function searchOpenFoodFactsByName(string $query): array
    {
        $cacheKey = 'off_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($query) {
            try {
                $response = Http::withHeaders([
                        'User-Agent' => 'BusinessPlusDZ/1.0 (contact: support@businessplus.dz)',
                    ])
                    ->timeout(6)
                    ->get('https://world.openfoodfacts.org/cgi/search.pl', [
                        'search_terms' => $query,
                        'search_simple'=> 1,
                        'action'       => 'process',
                        'json'         => 1,
                        'page_size'    => 16,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Open Food Facts text search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) return [];

            return collect($response->json('products', []))
                ->map(fn (array $p) => [
                    'id'    => 'off-' . ($p['code'] ?? uniqid()),
                    'thumb' => $p['image_front_small_url'] ?? $p['image_small_url'] ?? $p['image_url'] ?? null,
                    'full'  => $p['image_front_url'] ?? $p['image_url'] ?? null,
                ])
                ->filter(fn (array $r) => $r['thumb'] && $r['full'])
                ->values()
                ->all();
        });
    }

    /**
     * Google Custom Search (مقيّد بالمواقع الجزائرية من لوحة تحكم الـ CSE نفسها).
     * يُعيد مصفوفة فارغة بهدوء إن لم يُضبط المفتاح بعد — لا يكسر البحث.
     */
    private function searchGoogleImages(string $query): array
    {
        $apiKey = config('services.google_cse.key');
        $cx     = config('services.google_cse.cx');

        if (empty($apiKey) || empty($cx)) {
            return [];
        }

        $cacheKey = 'google_cse_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($apiKey, $cx, $query) {
            try {
                $response = Http::timeout(8)->get('https://www.googleapis.com/customsearch/v1', [
                    'key'        => $apiKey,
                    'cx'         => $cx,
                    'q'          => $query,
                    'searchType' => 'image',
                    'num'        => 10,
                    'safe'       => 'active',
                ]);
            } catch (\Throwable $e) {
                Log::warning('Google CSE search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) return [];

            return collect($response->json('items', []))
                ->map(fn (array $it) => [
                    'id'     => 'g-' . md5($it['link'] ?? uniqid()),
                    'thumb'  => $it['image']['thumbnailLink'] ?? $it['link'] ?? null,
                    'full'   => $it['link'] ?? null,
                    'source' => $it['displayLink'] ?? null,
                ])
                ->filter(fn (array $r) => $r['thumb'] && $r['full'])
                ->values()
                ->all();
        });
    }

    /**
     * Pexels — احتياطي عام (صور ستوك، ليست منتجات حقيقية بالضرورة).
     * يُستدعى فقط عند نقص النتائج من المصادر الأدق أعلاه.
     */
    private function searchPexelsImages(string $query, int $page = 1): array
    {
        $apiKey = config('services.pexels.key');
        if (empty($apiKey)) return [];

        $cacheKey = 'pexels_image_search:' . md5(mb_strtolower($query) . '|' . $page);

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($apiKey, $query, $page) {
            try {
                $response = Http::withHeaders(['Authorization' => $apiKey])
                    ->timeout(8)
                    ->get('https://api.pexels.com/v1/search', [
                        'query'    => $query,
                        'per_page' => 24,
                        'page'     => $page,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Pexels image search failed (connection)', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) {
                Log::warning('Pexels image search failed (http)', ['status' => $response->status(), 'query' => $query]);
                return [];
            }

            return collect($response->json('photos', []))
                ->map(function (array $p) {
                    $src = $p['src'] ?? [];
                    return [
                        'id'           => (string) ($p['id'] ?? ''),
                        'thumb'        => $src['medium'] ?? $src['small'] ?? null,
                        'full'         => $src['large2x'] ?? $src['large'] ?? $src['original'] ?? null,
                        'photographer' => $p['photographer'] ?? null,
                    ];
                })
                ->filter(fn (array $p) => $p['id'] !== '' && $p['thumb'] && $p['full'])
                ->values()
                ->all();
        });
    }

    /**
     * نقطة الدخول الموحّدة لميزة "اقتراح صورة": تدمج المصادر بترتيب الدقة —
     *   1) مطابقة الباركود عبر Open Food Facts (إن وُجد باركود) — دقة مطلقة
     *   2) Google المقيّد بالمواقع الجزائرية + متاجر جزائرية حقيقية عبر Store API
     *   3) Open Food Facts بحث نصي — منتجات حقيقية عالمية
     *   4) Pexels كاحتياطي فقط عند نقص النتائج
     * مع إزالة التكرار حسب رابط الصورة الكامل.
     */
    public function searchProductImages(string $query, int $page = 1, ?string $barcode = null): array
    {
        $query = trim($query);
        if ($query === '') return [];

        $barcodeMatch = $barcode ? $this->searchOpenFoodFactsByBarcode($barcode) : null;

        $merged = array_merge(
            $this->searchGoogleImages($query),
            $this->searchAlgerianStores($query),
            $this->searchOpenFoodFactsByName($query),
        );

        if (count($merged) < 6) {
            $merged = array_merge($merged, $this->searchPexelsImages($query, $page));
        }

        if ($barcodeMatch) {
            array_unshift($merged, $barcodeMatch);
        }

        $seen   = [];
        $unique = [];
        foreach ($merged as $item) {
            if (empty($item['full']) || isset($seen[$item['full']])) continue;
            $seen[$item['full']] = true;
            $unique[] = $item;
        }

        return $unique;
    }

    // =========================================================
    // Slug Helper
    // =========================================================


}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\ProductSuggestionService.php
```php
<?php

namespace App\Services;

use App\Models\CommercialDocumentLine;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductSuggestionService
{
    public function getSuggestions(int $partyId, int $limit = 5, ?bool $isPurchase = null): array
    {
        $query = CommercialDocumentLine::query()
            ->join('commercial_documents', 'commercial_document_lines.commercial_document_id', '=', 'commercial_documents.id')
            ->join('products', 'commercial_document_lines.product_id', '=', 'products.id')
            ->join('document_types', 'commercial_documents.document_type_id', '=', 'document_types.id')
            ->join('document_base_operations', 'document_types.document_base_operation_id', '=', 'document_base_operations.id')
            ->where('commercial_documents.party_id', $partyId)
            ->whereNotNull('commercial_document_lines.product_id')
            ->select(
                'products.id',
                'products.name',
                'products.ref',
                DB::raw('COUNT(DISTINCT commercial_documents.id) as order_count'),
                DB::raw('SUM(commercial_document_lines.quantity) as total_qty'),
                DB::raw('MAX(commercial_document_lines.created_at) as last_purchased_at'),
            );

        if ($isPurchase === true) {
            $query->where('document_base_operations.name', 'purchase');
        } elseif ($isPurchase === false) {
            $query->where('document_base_operations.name', 'sale');
        }

        $products = $query
            ->groupBy('products.id', 'products.name', 'products.ref')
            ->orderByDesc('order_count')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        if ($products->isEmpty()) {
            return [];
        }

        $productIds = $products->pluck('id');

        $lastPrices = CommercialDocumentLine::query()
            ->join('commercial_documents', 'commercial_document_lines.commercial_document_id', '=', 'commercial_documents.id')
            ->whereIn('commercial_document_lines.product_id', $productIds)
            ->where('commercial_documents.party_id', $partyId)
            ->select(
                'commercial_document_lines.product_id',
                DB::raw('MAX(commercial_document_lines.created_at) as last_created'),
            )
            ->groupBy('commercial_document_lines.product_id')
            ->get()
            ->keyBy('product_id');

        $priceQuery = CommercialDocumentLine::query()
            ->whereIn('product_id', $productIds)
            ->whereIn('created_at', $lastPrices->pluck('last_created'))
            ->select('product_id', 'unit_price_ht', 'tva_rate')
            ->get()
            ->keyBy('product_id');

        $result = [];
        foreach ($products as $p) {
            $lastPriceRow = $priceQuery->get($p->id);
            $result[] = [
                'id'               => $p->id,
                'name'             => $p->name,
                'ref'              => $p->ref,
                'order_count'      => (int) $p->order_count,
                'total_qty'        => (float) $p->total_qty,
                'suggested_price'  => $lastPriceRow ? (float) $lastPriceRow->unit_price_ht : null,
                'suggested_tva'    => $lastPriceRow ? (float) $lastPriceRow->tva_rate : null,
            ];
        }

        return $result;
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\ProductTypeService.php
```php
<?php

namespace App\Services;

use App\Models\ProductType;

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = ProductType::class;
    protected string $resourceName = 'product_type';
    protected function getResourceName(): string { return $this->resourceName; }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\ProductVariantService.php
```php
<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Barcode;
use App\Core\Services\BaseService;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductVariantService extends BaseService
{
    protected string $model = ProductVariant::class;

    protected function getResourceName(): string
    {
        return 'product_variant';
    }

    /**
     * تنفيذ منطق قبل الإنشاء
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        // استخدام parent إذا كنت تريد تنفيذ أي منطق عام مضاف في BaseService مستقبلاً
        $data = parent::beforeCreate($data, $request);

        if (!isset($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }

        if (!isset($data['created_by']) && auth()->check()) {
            $data['created_by'] = auth()->id();
        }

        return $data;
    }

    /**
     * تنفيذ منطق بعد الإنشاء (داخل الترانزاكشن)
     */
    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // إضافة الباركود إذا وجد
        if (!empty($data['barcode'])) {
            Barcode::create([
                'company_id' => $item->company_id,
                'product_id' => $item->product_id,
                'variant_id' => $item->id,
                'barcode'    => $data['barcode'],
                'is_primary' => true,
                'type'       => 'variant',
                'created_by' => auth()->id(),
            ]);
        }
    }

    /**
     * تصحيح توقيع الدالة لتتطابق مع BaseService
     */
    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // استدعاء الأب مهم جداً لأنه يحتوي على فحص عدم تغيير الـ company_id
        parent::beforeUpdate($item, $data, $request);

        // أي منطق إضافي قبل التحديث يوضع هنا
        // ملاحظة: لا حاجة لعمل unset لـ product_id هنا لأن دالة prepareDataForUpdate
        // في الكلاس الأب تقوم بتنظيف البيانات تلقائياً بناءً على الأعمدة.
    }
}

```

## Requests

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\Productlotrequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['required', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreProductLotRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['nullable', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}



```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreProductRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreProductRequest
 *
 * الإصلاح: قواعد unique الأصلية كانت global (unique:products,ref)
 * مما يمنع شركتين مختلفتين من استخدام نفس ref/barcode/slug.
 *
 * الصحيح في بيئة Multi-Tenancy: الـ unique يكون بنطاق company_id
 * باستخدام Rule::unique()->where('company_id', ...).
 */
class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ✅ company_id من السياق — HasCompany يضبطه تلقائياً عند الحفظ،
        //    لكن نحتاجه هنا للتحقق من الـ unique.
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // ── المنتج الأساسي ──
            'name'            => 'required|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id
            'slug'    => [
                'nullable', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'required|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            // ── التسعير والمخزون ──
            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

            // ── الأبعاد ──
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            // ── وحدات التعبئة (Colisages) ──
            'packagings'                 => 'nullable|array',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            // ✅ إصلاح: unique مقيّد بـ company_id
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            // ── التعريفات (Tarifs) ──
            'prices'                  => 'nullable|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts'                       => 'nullable|array',
            'quantity_discounts.*.price_level_id'      => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'             => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'             => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'     => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'          => 'nullable|boolean',
            'quantity_discounts.*.active'              => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                            => 'اسم المنتج مطلوب',
            'product_type_id.required'                 => 'نوع المنتج مطلوب',
            'ref.unique'                               => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                           => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                              => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.code.required_with'          => 'رمز التعبئة مطلوب عند إضافة تعبئة',
            'packagings.*.label.required_with'         => 'تسمية التعبئة مطلوبة عند إضافة تعبئة',
            'packagings.*.barcode.unique'              => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.price_level_id.required_with'   => 'مستوى السعر مطلوب عند إضافة تعريف',
            'prices.*.pricing_method.required_with'   => 'طريقة التسعير مطلوبة عند إضافة تعريف',
            'prices.*.pricing_method.in'              => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.min_qty.required_with' => 'الحد الأدنى للكمية مطلوب عند إضافة خصم',
            'quantity_discounts.*.max_qty.gt'         => 'الحد الأعلى يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreProductVariantRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = \App\Models\Product::find($this->product_id);
        return $product && $this->user()->can('create', [\App\Models\ProductVariant::class, $product]);
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:50|unique:barcodes,barcode', // سنتحقق من uniqueness مع الشركة لاحقاً
            'price_type' => 'nullable|in:fixed,percentage',
            'price_value' => 'nullable|numeric|min:0',
            'stock' => 'nullable|numeric|min:0',
            'track_stock' => 'nullable|boolean',
            'attributes' => 'nullable|array',
            'image' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'active' => 'nullable|boolean',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateProductLotRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateProductRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * UpdateProductRequest
 *
 * الإصلاح: نفس إصلاح StoreProductRequest — قواعد unique مقيّدة بـ company_id
 * مع استثناء السجل الحالي (ignore).
 */
class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('product');

        // ✅ company_id من السياق
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'            => 'sometimes|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            'slug'    => [
                'sometimes', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'sometimes|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            'packagings'                 => 'sometimes|array',
            'packagings.*.id'            => 'nullable|integer|exists:product_packagings,id',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            // ملاحظة: لا يمكن استخدام wildcard في ignore مع nested arrays — نتحقق في Service
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            'prices'                  => 'sometimes|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            'quantity_discounts'                       => 'sometimes|array',
            'quantity_discounts.*.price_level_id'      => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'             => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'             => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'     => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'          => 'nullable|boolean',
            'quantity_discounts.*.active'              => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'ref.unique'                             => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                         => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                            => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.barcode.unique'            => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.pricing_method.in'             => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.max_qty.gt'        => 'الحد الأعلى للكمية يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateProductVariantRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('variant'));
    }

    public function rules(): array
    {
        $variantId = $this->route('variant')->id;

        return [
            'sku' => 'nullable|string|max:100|unique:product_variants,sku,' . $variantId,
            'barcode' => 'nullable|string|max:50',
            'price_type' => 'nullable|in:fixed,percentage',
            'price_value' => 'nullable|numeric|min:0',
            'stock' => 'nullable|numeric|min:0',
            'track_stock' => 'nullable|boolean',
            'attributes' => 'nullable|array',
            'image' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'active' => 'nullable|boolean',
        ];
    }
}

```

## Policies

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\ProductLotPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductLotPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_lot');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_lot');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_lot');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_lot');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_lot');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_lot');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_lot');
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\ProductPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product');
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\ProductTypePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_type');
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\ProductVariantPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

class ProductVariantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function create(User $user, Product $product): bool
    {
        return $user->hasAccessToCompany($product->company_id);
    }

    public function update(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function delete(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }
}

```

## Migrations

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2025_10_15_093205_create_product_types_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('manages_stock')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_types');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2025_10_15_093308_create_products_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 150);
            $table->string('slug', 150)->nullable()->index();
            $table->string('ref', 50)->nullable()->index()->comment('SKU / مرجع المنتج');
            $table->string('barcode', 50)->nullable()->index()->comment('الباركود');
            $table->text('description')->nullable();
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_type_id')->nullable()->constrained('product_types')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('tva_id')->nullable()->constrained('tvas')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete()->cascadeOnUpdate();
            $table->decimal('purchase_price_ht', 15, 4)->default(0)->comment('سعر الشراء الأساسي');
            $table->decimal('current_cost_price', 15, 4)->default(0)->comment('آخر تكلفة محسوبة (PMP/FIFO/LIFO)');
            $table->boolean('manages_stock')->default(true);
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('has_lots')->default(false);
            $table->boolean('has_expiration_date')->default(false);
            $table->decimal('min_stock_alert', 15, 4)->default(0);
            $table->decimal('max_stock_alert', 15, 4)->default(0);
            $table->boolean('manages_quantity_discounts')->default(false);
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('volume', 8, 2)->nullable();
            $table->decimal('length', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->foreignId('valuation_method_id')->nullable()->constrained('inventory_valuation_methods')->nullOnDelete()->cascadeOnUpdate();
            $table->json('specifications')->nullable()->comment('خصائص تقنية مرنة');
            $table->json('images')->nullable();
            $table->string('meta_title', 200)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('meta_keywords')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'active']);
            $table->index(['company_id', 'name', 'active']);
            $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');

            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'description']);
            }
        });
    }
    public function down(): void {
        Schema::dropIfExists('products');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_04_28_184027_create_product_packagings_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_packagings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('code', 20)->comment('UN / FD / PLT');
            $table->string('label', 100)->comment('قارورة / فاردو / باليطة');
            $table->decimal('quantity', 15, 4)->default(1)->comment('عدد الوحدات الأساسية في هذه التعبئة');
            $table->string('barcode', 50)->nullable()->index()->comment('باركود خاص بهذه التعبئة');
            $table->boolean('is_default')->default(false)->comment('الوحدة الأساسية (quantity=1)');
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'code'], 'product_packaging_code_unique');
            $table->unique(['company_id', 'barcode'], 'packagings_company_barcode_unique');
            $table->index(['company_id', 'product_id', 'active']);
            $table->index(['company_id', 'product_id', 'is_default']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_packagings');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_04_28_184054_create_product_prices_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('pricing_method', ['fixed', 'rate', 'margin'])->default('fixed')->comment('fixed=سعر مباشر | rate=نسبة% فوق الشراء | margin=هامش ثابت دج');
            $table->decimal('price', 15, 4)->nullable()->comment('Prix de Vente HT — للطريقة fixed فقط');
            $table->decimal('rate', 8, 4)->nullable()->comment('Taux % — للطريقة rate فقط');
            $table->decimal('margin', 15, 4)->nullable()->comment('Marge دج — للطريقة margin فقط');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'price_level_id'], 'product_price_level_unique');
            $table->index(['company_id', 'product_id', 'active']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE product_prices ADD CONSTRAINT chk_pricing_method CHECK ((pricing_method = 'fixed' AND price IS NOT NULL AND price >= 0) OR (pricing_method = 'rate' AND rate IS NOT NULL AND rate >= 0) OR (pricing_method = 'margin' AND margin IS NOT NULL))");
        }
    }
    public function down(): void {
        Schema::dropIfExists('product_prices');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_04_28_184501_create_product_lots_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('lot_number', 50)->index();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->date('manufacturing_date')->nullable()->index();
            $table->date('expiration_date')->nullable()->index();
            $table->date('purchase_date')->index();
            $table->decimal('purchase_price', 15, 4);
            $table->decimal('legal_selling_price', 15, 4);
            $table->decimal('margin_percentage', 8, 4)->default(5.00);
            $table->decimal('original_quantity', 15, 4);
            $table->decimal('remaining_quantity', 15, 4)->index();

            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')->index();
                $table->decimal('total_cost', 15, 4)->storedAs('original_quantity * purchase_price');
                $table->decimal('remaining_value', 15, 4)->storedAs('remaining_quantity * purchase_price');
            } else {
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost', 15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            $table->unsignedBigInteger('stock_movement_id')->nullable()->comment('FK يُضاف لاحقاً');
            $table->string('supplier_lot_number', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'lot_number'], 'product_lots_company_lot_unique');
            $table->index(['company_id', 'product_id', 'warehouse_id', 'is_depleted', 'purchase_date'], 'idx_fifo_lookup');
            $table->index(['company_id', 'active', 'remaining_quantity'], 'idx_active_stock');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE product_lots ADD CONSTRAINT chk_quantities CHECK (remaining_quantity >= 0 AND remaining_quantity <= original_quantity)");
        }
    }
    public function down(): void {
        Schema::dropIfExists('product_lots');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_05_02_084253_create_product_variants_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 50)->nullable();
            $table->enum('price_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('price_value', 15, 4)->nullable();
            $table->decimal('stock', 15, 4)->nullable();
            $table->boolean('track_stock')->nullable();
            $table->json('attributes')->nullable();
            $table->string('image')->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('volume', 10, 2)->nullable();
            $table->boolean('active')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sku'], 'pv_company_sku_unique');
            $table->unique(['company_id', 'barcode'], 'pv_company_barcode_unique');
            $table->index(['company_id', 'product_id', 'active']);
            $table->index(['company_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_variants');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_06_20_230508_add_min_margin_percentage_to_products_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('min_margin_percentage', 5, 2)->nullable()->after('purchase_price_ht');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('min_margin_percentage');
        });
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_06_26_000003_create_regulated_products_config_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regulated_products_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();

            $table->string('product_key', 80);
            $table->string('label');
            $table->string('unit_label');
            $table->string('category');
            $table->decimal('regulated_max_price', 15, 4);
            $table->decimal('regulated_margin', 15, 4)->nullable();
            $table->enum('regulation_type', ['price', 'margin'])->default('price');
            $table->string('legal_reference')->nullable();
            $table->date('effective_date')->nullable();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'product_key']);
            $table->index(['company_id', 'category', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regulated_products_config');
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_06_26_000004_add_subsidized_fields_to_products.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite triggers that reference the products table must be dropped
        // before any ALTER TABLE on products (SQLite limitation).
        $allTriggers = DB::select("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'");
        $dropped = [];
        foreach ($allTriggers as $t) {
            if (stripos($t->sql, 'products') !== false) {
                $dropped[$t->name] = $t->sql;
                DB::statement("DROP TRIGGER IF EXISTS `{$t->name}`");
            }
        }

        $hasCol = !empty(DB::select("PRAGMA table_info(products)"));
        $colExists = collect(DB::select("PRAGMA table_info(products)"))
            ->contains(fn($c) => $c->name === 'is_subsidized');

        if (!$colExists) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('is_subsidized')->default(false)->after('active');
                $table->foreignId('regulated_product_config_id')
                      ->nullable()
                      ->constrained('regulated_products_config')
                      ->nullOnDelete()
                      ->after('is_subsidized');
            });
        }

        foreach ($dropped as $sql) {
            DB::statement($sql);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['regulated_product_config_id']);
            $table->dropColumn(['is_subsidized', 'regulated_product_config_id']);
        });
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_07_11_192607_add_products_sort_index_to_products_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasIndex('products', 'idx_products_list_sort')) {
                $table->index(['company_id', 'active', 'created_at'], 'idx_products_list_sort');
            }
            if (!Schema::hasIndex('products', 'products_company_id_active_index')) {
                $table->index(['company_id', 'active']);
            }
            if (!Schema::hasIndex('products', 'products_company_id_name_active_index')) {
                $table->index(['company_id', 'name', 'active']);
            }
            if (!Schema::hasIndex('products', 'idx_products_lookup')) {
                $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            }
            if (!Schema::hasIndex('products', 'idx_products_filter')) {
                $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_list_sort');
            $table->dropIndex(['company_id', 'active']);
            $table->dropIndex(['company_id', 'name', 'active']);
            $table->dropIndex('idx_products_lookup');
            $table->dropIndex('idx_products_filter');
        });
    }
};

```

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2026_07_11_193459_add_missing_products_indexes.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasIndex('products', 'products_company_id_name_active_index')) {
                $table->index(['company_id', 'name', 'active']);
            }
            if (!Schema::hasIndex('products', 'idx_products_lookup')) {
                $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            }
            if (!Schema::hasIndex('products', 'idx_products_filter')) {
                $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'name', 'active']);
            $table->dropIndex('idx_products_lookup');
            $table->dropIndex('idx_products_filter');
        });
    }
};

```

