<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class DocumentStatus extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'document_statuses';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
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
}