<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Product Model
 *
 * Table: products
 * Stores general product information (parent level)
 */
#[Cacheable]
class Product extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'products';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'slug',
        'description',
        'family_id',
        'brand_id',
        'product_type_id',
        'specifications',
        'images',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'active',
        ];

    // -------------------- Casts --------------------
    protected $casts = [
        'specifications' => 'array',
        'images' => 'array',
        'meta_keywords' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'description',
        'meta_title',
        'meta_description',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'family_id',
        'brand_id',
        'product_type_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'created_at',
        'updated_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'family',
        'brand',
        'productType',
        'variants',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['products'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = ['variants'];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function productType(): BelongsTo
    {
        return $this->belongsTo(ProductType::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    // -------------------- Scopes --------------------

    public function scopeWithVariants(Builder $query): Builder
    {
        return $query->has('variants');
    }

    public function scopeByFamily(Builder $query, int $familyId): Builder
    {
        return $query->where('family_id', $familyId);
    }

    public function scopeByBrand(Builder $query, int $brandId): Builder
    {
        return $query->where('brand_id', $brandId);
    }

    // -------------------- Helpers --------------------

    public function hasVariants(): bool
    {
        return $this->variants()->exists();
    }

    public function getMainImage(): ?string
    {
        return $this->images[0] ?? null;
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
        });

        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                $product->slug = Str::slug($product->name);
            }
        });
    }
}
