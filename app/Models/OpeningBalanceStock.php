<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class OpeningBalanceStock extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'opening_balances_stock';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'product_id',
        'warehouse_id',
        'opening_quantity',
        'opening_value',
        'lot_number',
        'manufacturing_date',
        'expiration_date',
    ];

    protected $casts = [
        'opening_quantity' => 'decimal:3',
        'opening_value' => 'decimal:4',
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'product_id', 'warehouse_id'];
    public static array $sortable = ['id', 'opening_quantity', 'opening_value'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'product', 'warehouse'];
    public static string $defaultSort = 'product_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_stock'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

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