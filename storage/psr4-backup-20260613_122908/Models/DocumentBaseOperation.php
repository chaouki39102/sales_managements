<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class DocumentBaseOperation extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'document_base_operations';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['documentTypes'];
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['document_base_operations', 'api'];

    public function documentTypes(): HasMany
    {
        return $this->hasMany(DocumentType::class);
    }
}