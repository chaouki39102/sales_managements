<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class InventoryValuationMethod extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'inventory_valuation_methods';

    protected $fillable = [
        'company_id',
        'name',
        'method',
        'is_default',
        'active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'active' => 'boolean',
    ];

    public static array $searchableFields = ['name', 'method'];
    public static array $filterable = ['is_default', 'method'];
    public static array $sortable = ['id', 'name', 'method'];
    public static array $allowedIncludes = ['products'];
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['inventory_valuation_methods', 'api'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'valuation_method_id');
    }
}