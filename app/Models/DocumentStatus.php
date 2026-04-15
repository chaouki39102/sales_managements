<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * DocumentStatus Model
 *
 * Table: document_statuses
 * Manages commercial document statuses
 */
#[Cacheable]
class DocumentStatus extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'document_statuses';

    protected $fillable = [
        'name',
        'label',
        'color',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['name'];
    public static array $sortable = ['id', 'name', 'label'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocuments'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_statuses', 'lookups'];

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function scopeByName(Builder $query, string $name): Builder
    {
        return $query->where('name', $name);
    }
}
