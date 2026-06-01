# Module Export: Product
Generated at: 2026-06-01 13:20:51

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Product.php
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
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;

#[Cacheable]
class Product extends Model
{
    use HasCompany, HasStandardizedConfiguration, SoftDeletes,
        Auditable, HasTenantSlug, HasTenantRouteBinding;

    protected $table = 'products';

    protected $fillable = [
        'company_id',
        'name', 'slug', 'ref', 'barcode', 'description',
        'family_id', 'brand_id', 'product_type_id',
        'tva_id', 'unit_id',
        'purchase_price_ht', 'current_cost_price',
        'manages_stock', 'allow_negative_stock', 'has_lots', 'has_expiration_date',
        'min_stock_alert', 'max_stock_alert', 'manages_quantity_discounts',
        'valuation_method_id',
        'weight', 'volume', 'length', 'width', 'height',
        'specifications', 'images', 'meta_title', 'meta_description', 'meta_keywords',
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

    protected $appends = ['current_stock', 'is_low_stock'];

    public static array $searchableFields = ['name', 'ref', 'barcode', 'description'];
    public static array $filterable = [
        'family_id', 'brand_id', 'product_type_id', 'tva_id', 'unit_id', 'valuation_method_id',
        'manages_stock', 'has_lots', 'has_expiration_date', 'manages_quantity_discounts', 'active'
    ];
    public static array $sortable = ['id', 'name', 'ref', 'purchase_price_ht', 'created_at', 'updated_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'family', 'brand', 'productType', 'tva', 'unit', 'valuationMethod',
        'packagings', 'prices', 'prices.priceLevel', 'quantityDiscounts', 'quantityDiscounts.priceLevel',
        'stockMovements', 'lots', 'documentLines', 'openingBalances', 'barcodes', 'primaryBarcode'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['products'];


    // Relations
    // app/Models/Product.php — أضف هذه الدالة

    public function family(): BelongsTo { return $this->belongsTo(Family::class); }
    public function brand(): BelongsTo { return $this->belongsTo(Brand::class); }
    public function variants() { return $this->hasMany(ProductVariant::class); }
    public function productType(): BelongsTo { return $this->belongsTo(ProductType::class); }
    public function tva(): BelongsTo { return $this->belongsTo(Tva::class); }
    public function unit(): BelongsTo { return $this->belongsTo(Unit::class); }
    public function valuationMethod(): BelongsTo { return $this->belongsTo(InventoryValuationMethod::class, 'valuation_method_id'); }
    public function barcodes(): HasMany { return $this->hasMany(Barcode::class); }
    public function primaryBarcode(): HasOne { return $this->hasOne(Barcode::class)->where('is_primary', true); }
    public function packagings(): HasMany { return $this->hasMany(ProductPackaging::class)->orderBy('display_order'); }
    public function prices(): HasMany { return $this->hasMany(ProductPrice::class); }
    public function quantityDiscounts(): HasMany { return $this->hasMany(QuantityDiscount::class)->orderBy('price_level_id')->orderBy('tier_order'); }
    public function stockMovements(): HasMany { return $this->hasMany(StockMovement::class); }
    public function lots(): HasMany { return $this->hasMany(ProductLot::class); }
    public function documentLines(): HasMany { return $this->hasMany(CommercialDocumentLine::class); }
    public function openingBalances(): HasMany { return $this->hasMany(OpeningBalanceStock::class); }

    // Scopes
    public function scopeByFamily(Builder $q, int $familyId): Builder { return $q->where('family_id', $familyId); }
    public function scopeByBrand(Builder $q, int $brandId): Builder { return $q->where('brand_id', $brandId); }
    public function scopeManagesStock(Builder $q): Builder { return $q->where('manages_stock', true); }
    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereColumn('min_stock_alert', '>=',
            StockMovement::selectRaw('COALESCE(stock_balance_after, 0)')
                ->whereColumn('product_id', 'products.id')
                ->latest('movement_date')->latest('id')->limit(1)
        );
    }

    // Accessors
    public function getCurrentStockAttribute(): float
    {
        return (float) ($this->stockMovements()->latest('movement_date')->latest('id')->value('stock_balance_after') ?? 0);
    }
    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) return false;
        return $this->current_stock <= (float) $this->min_stock_alert;
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
        $totalValue = 0; $totalQuantity = 0;
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductLot.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductPackaging.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductPrice.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductType.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductVariant.php
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

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\ProductController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\ProductLotController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\ProductTypeController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\ProductVariantController.php
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

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\ProductLotService.php
```php
<?php

namespace App\Services;

use App\Models\ProductLot;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected function getResourceName(): string { return $this->resourceName; }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\ProductService.php
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
    // Slug Helper
    // =========================================================


}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\ProductTypeService.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Services\ProductVariantService.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\Productlotrequest.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreProductRequest.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreProductVariantRequest.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateProductRequest.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateProductVariantRequest.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ProductLotPolicy.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ProductPolicy.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ProductTypePolicy.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ProductVariantPolicy.php
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

