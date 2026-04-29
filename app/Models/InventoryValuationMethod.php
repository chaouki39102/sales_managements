<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class InventoryValuationMethod extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name', 'method', 'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public static array $searchableFields = ['name', 'method'];
    public static array $filterable = ['is_default', 'method'];
    public static array $sortable = ['id', 'name', 'method'];
    public static array $allowedIncludes = ['products']; // ✅ تعديل: بدلاً من productVariants
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['inventory_valuation_methods', 'api'];

    // ✅ العلاقة مع المنتجات مباشرة
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'valuation_method_id');
    }
}