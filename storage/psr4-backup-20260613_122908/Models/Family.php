<?php

// app/Models/Family.php
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
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;

#[Cacheable]
class Family extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, Auditable,
        HasCompany, HasTenantSlug, HasTenantRouteBinding;

    protected $table = 'families';

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'description',
        'parent_id',
        'active',
        'display_order',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'products', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['families'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Family::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Family::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }


}
