<?php

namespace App\Models;

use App\Core\Attributes\Cacheable;
use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;

#[Cacheable]
class DocumentTypeConversion extends Model
{
    use HasCompany;

    protected $table = 'document_type_conversions';

    protected $fillable = [
        'company_id',
        'source_code',
        'target_code',
        'display_order',
    ];

    public static array $filterable = ['source_code', 'target_code'];
    public static array $sortable = ['id', 'source_code', 'display_order'];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_type_conversions', 'lookups'];
}
