<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class OpeningBalanceStock extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'opening_balances_stock';

    protected $fillable = [
        'fiscal_year_id', 'product_id', 'warehouse_id', 'opening_quantity', 'opening_value',
    ];

    protected $casts = [
        'opening_quantity' => 'decimal:3',
        'opening_value' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'product_id', 'warehouse_id'];
    public static array $sortable = ['id', 'opening_quantity', 'opening_value'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'product', 'warehouse']; // ✅ تعديل
    public static string $defaultSort = 'product_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_stock'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    // ✅ العلاقة مع المنتج مباشرة (بدلاً من productVariant)
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getAverageCostPrice(): float
    {
        if ($this->opening_quantity <= 0) {
            return 0;
        }
        return $this->opening_value / $this->opening_quantity;
    }
}