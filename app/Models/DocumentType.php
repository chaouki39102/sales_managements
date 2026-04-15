<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * DocumentType Model
 *
 * Table: document_types
 * Defines types of commercial documents
 */
#[Cacheable]
class DocumentType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'document_types';

    protected $fillable = [
        'name',
        'name_latin',
        'code',
        'description',
        'document_base_operation_id',
        'affects_stock_direction',
        'requires_party',
        'affects_accounting',
        'is_printable',
        'print_template',
        'active',
        'display_order',
    ];

    protected $casts = [
        'affects_stock_direction' => 'integer',
        'requires_party' => 'boolean',
        'affects_accounting' => 'boolean',
        'is_printable' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'name_latin', 'code', 'description'];
    public static array $filterable = ['document_base_operation_id', 'active', 'requires_party'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentBaseOperation', 'numberingSeries', 'commercialDocuments'];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_types', 'lookups'];

    public function documentBaseOperation(): BelongsTo
    {
        return $this->belongsTo(DocumentBaseOperation::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function affectsStockIn(): bool
    {
        return $this->affects_stock_direction === 1;
    }

    public function affectsStockOut(): bool
    {
        return $this->affects_stock_direction === -1;
    }
}
