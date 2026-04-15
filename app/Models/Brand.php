<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Brand Model
 *
 * Table: brands
 * Product brands/manufacturers
 */
#[Cacheable]
class Brand extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo',
        'website',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description', 'website'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['brands'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($brand) {
            if (empty($brand->slug)) {
                $brand->slug = Str::slug($brand->name);
            }
        });
    }


}
