<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\AuditableEnhanced;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ExpenseCategory extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, AuditableEnhanced, HasCompany;

    protected $table = 'expense_categories';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'description',
        'parent_id',
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

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'expenses', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['expense_categories'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
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
}