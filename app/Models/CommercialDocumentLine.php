<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * CommercialDocumentLine Model
 *
 * Table: commercial_document_lines
 * Stores line items for commercial documents
 */
#[Cacheable]
class CommercialDocumentLine extends Model
{
    use
        HasCompany,
    HasStandardizedConfiguration;

    protected $table = 'commercial_document_lines';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'commercial_document_id',
        'product_id',
        'line_order',
        'description',
        'quantity',
        'delivered_quantity',
        'returned_quantity',
        'unit_price_ht',
        'discount_percentage',
        'discount_amount',
        'additional_costs',
        'total_additional_cost',
        'total_discount_amount',
        'tva_rate',
        'total_ht',
        'total_tva',
        'total_ttc',
        'stock_lot_id',
        'is_auto_split',
        'parent_line_id',
        'line_attributes',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'additional_costs' => 'array',
        'total_additional_cost' => 'decimal:4',
        'total_discount_amount' => 'decimal:4',
        'line_order' => 'integer',
        'quantity' => 'decimal:3',
        'delivered_quantity' => 'decimal:3',
        'returned_quantity' => 'decimal:3',
        'unit_price_ht' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'tva_rate' => 'decimal:2',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'is_auto_split' => 'boolean',
        'line_attributes' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'description',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'commercial_document_id',
        'product_id',
        'stock_lot_id',
        'is_auto_split',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'line_order',
        'quantity',
        'total_ttc',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'commercialDocument',
        'product',
        'stockLot',
        'parentLine',
        'childLines',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'line_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 50;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 200;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['commercial_document_lines'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function commercialDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function parentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function childLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'commercial_document_line_id');
    }

    // -------------------- Scopes --------------------

    public function scopeParentLines(Builder $query): Builder
    {
        return $query->whereNull('parent_line_id');
    }

    public function scopeChildLines(Builder $query): Builder
    {
        return $query->whereNotNull('parent_line_id');
    }

    // -------------------- Helpers --------------------

    public function getRemainingQuantity(): float
    {
        return $this->quantity - $this->delivered_quantity - $this->returned_quantity;
    }

    public function isFullyDelivered(): bool
    {
        return $this->getRemainingQuantity() <= 0;
    }

    public function hasDiscount(): bool
    {
        return $this->discount_percentage > 0 || $this->discount_amount > 0;
    }
}
