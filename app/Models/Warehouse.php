<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * Warehouse Model
 *
 * Table: warehouses
 * Manages inventory storage locations
 */
#[Cacheable]
class Warehouse extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,
        SoftDeletes,
        Auditable;

    protected $table = 'warehouses';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'code',
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'manager_name',
        'activity',
        'rc',
        'nif',
        'nis',
        'ai',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'code',
        'phone',
        'manager_name',
        'nif',
        'rc',
        'address',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'commune_id',
        'wilaya_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'code',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'commune',
        'wilaya',
        'commercialDocuments',
        'stockMovements',
        'productLots',
        'numberingSeries',
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
    public static ?int $cacheTtl = 600;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['warehouses'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function productLots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    // -------------------- Accessors --------------------

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }
}
