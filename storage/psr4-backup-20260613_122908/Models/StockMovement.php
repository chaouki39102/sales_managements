<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;

#[Cacheable]
class StockMovement extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes, BelongsToFiscalYear;

    protected $table = 'stock_movements';

    protected $fillable = [
        'company_id',
        'product_id',
        'warehouse_id',
        'packaging_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'movement_date',
        'quantity',
        'packaging_quantity',
        'unit_price',
        'cost_price',
        'total_price',
        'price_source',
        'stock_balance_after',
        'lot_number',
        'expiration_date',
        'stock_lot_id',
        'reason',
        'notes',
        'user_id',
        'parent_movement_id',
        'is_validated',
        'validated_by',
        'validated_at',
        'created_by',
    ];

    protected $casts = [
        'movement_date' => 'datetime',
        'quantity' => 'decimal:4',
        'packaging_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'cost_price' => 'decimal:4',
        'total_price' => 'decimal:4',
        'stock_balance_after' => 'decimal:4',
        'expiration_date' => 'date',
        'is_validated' => 'boolean',
        'validated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['lot_number', 'reason', 'notes'];
    public static array $filterable = [
        'product_id', 'warehouse_id', 'fiscal_year_id', 'stock_movement_type_id',
        'commercial_document_line_id', 'user_id', 'stock_lot_id', 'is_validated'
    ];
    public static array $sortable = ['id', 'movement_date', 'quantity', 'total_price', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'product', 'warehouse', 'packaging', 'fiscalYear', 'stockMovementType',
        'commercialDocumentLine', 'user', 'parentMovement', 'validatedBy', 'stockLot', 'createdBy'
    ];
    public static string $defaultSort = 'movement_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 20;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['stock_movements'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function packaging(): BelongsTo { return $this->belongsTo(ProductPackaging::class, 'packaging_id'); }
    public function fiscalYear(): BelongsTo { return $this->belongsTo(FiscalYear::class); }
    public function stockMovementType(): BelongsTo { return $this->belongsTo(StockMovementType::class); }
    public function commercialDocumentLine(): BelongsTo { return $this->belongsTo(CommercialDocumentLine::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function parentMovement(): BelongsTo { return $this->belongsTo(StockMovement::class, 'parent_movement_id'); }
    public function validatedBy(): BelongsTo { return $this->belongsTo(User::class, 'validated_by'); }
    public function stockLot(): BelongsTo { return $this->belongsTo(ProductLot::class, 'stock_lot_id'); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function scopeValidated(Builder $query): Builder { return $query->where('is_validated', true); }
    public function scopeUnvalidated(Builder $query): Builder { return $query->where('is_validated', false); }
    public function scopeIncoming(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', fn($q) => $q->where('direction', 1));
    }
    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', fn($q) => $q->where('direction', -1));
    }
    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('movement_date', [$startDate, $endDate]);
    }

    public function isIncoming(): bool { return $this->stockMovementType?->direction === 1; }
    public function isOutgoing(): bool { return $this->stockMovementType?->direction === -1; }
    public function isAdjustment(): bool { return $this->stockMovementType?->direction === 0; }
}