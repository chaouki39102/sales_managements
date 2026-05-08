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

#[Cacheable]
class Warehouse extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes, Auditable;

    protected $table = 'warehouses';

    protected $fillable = [
        'company_id',
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

    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'phone', 'manager_name', 'nif', 'rc', 'address'];
    public static array $filterable = ['commune_id', 'wilaya_id', 'active'];
    public static array $sortable = ['id', 'name', 'code', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commune', 'wilaya', 'commercialDocuments', 'stockMovements', 'productLots', 'numberingSeries', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['warehouses'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function commune(): BelongsTo { return $this->belongsTo(Commune::class); }
    public function wilaya(): BelongsTo { return $this->belongsTo(Wilaya::class); }
    public function commercialDocuments(): HasMany { return $this->hasMany(CommercialDocument::class); }
    public function stockMovements(): HasMany { return $this->hasMany(StockMovement::class); }
    public function productLots(): HasMany { return $this->hasMany(ProductLot::class); }
    public function numberingSeries(): HasMany { return $this->hasMany(NumberingSeries::class); }

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([$this->address, $this->commune?->name, $this->wilaya?->name]);
        return implode(', ', $parts);
    }
}