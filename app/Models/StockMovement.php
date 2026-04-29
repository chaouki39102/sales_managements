<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\BelongsToFiscalYear;

/**
 * StockMovement Model
 *
 * Table: stock_movements
 * Tracks all inventory movements with FIFO support
 */
#[Cacheable]
class StockMovement extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        BelongsToFiscalYear;

    protected $table = 'stock_movements';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'movement_date',
        'quantity',
        'unit_price',
        'cost_price',
        'total_price',
        'stock_balance_after',
        'lot_number',
        'expiration_date',
        'reason',
        'notes',
        'user_id',
        'parent_movement_id',
        'is_validated',
        'validated_by',
        'validated_at',
        'stock_lot_id',
        'created_by',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'movement_date' => 'datetime',
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'cost_price' => 'decimal:4',
        'total_price' => 'decimal:4',
        'stock_balance_after' => 'decimal:3',
        'expiration_date' => 'date',
        'is_validated' => 'boolean',
        'validated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'lot_number',
        'reason',
        'notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'user_id',
        'stock_lot_id',
        'is_validated',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'movement_date',
        'quantity',
        'total_price',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'product',
        'warehouse',
        'fiscalYear',
        'stockMovementType',
        'commercialDocumentLine',
        'user',
        'parentMovement',
        'validatedBy',
        'stockLot',
        'createdBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'movement_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 20;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0; // No cache for transactional data

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['stock_movements'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);    
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function stockMovementType(): BelongsTo
    {
        return $this->belongsTo(StockMovementType::class);
    }

    public function commercialDocumentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'parent_movement_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------- Scopes --------------------

    public function scopeValidated(Builder $query): Builder
    {
        return $query->where('is_validated', true);
    }

    public function scopeUnvalidated(Builder $query): Builder
    {
        return $query->where('is_validated', false);
    }

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', 1);
        });
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', -1);
        });
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('movement_date', [$startDate, $endDate]);
    }

    // -------------------- Helpers --------------------

    public function isIncoming(): bool
    {
        return $this->stockMovementType?->direction === 1;
    }

    public function isOutgoing(): bool
    {
        return $this->stockMovementType?->direction === -1;
    }

    public function isAdjustment(): bool
    {
        return $this->stockMovementType?->direction === 0;
    }
}
