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