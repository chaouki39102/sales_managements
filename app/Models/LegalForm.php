<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * LegalForm Model
 *
 * Table: legal_forms
 * Legal forms for companies (SARL, EURL, SPA, etc.)
 */
#[Cacheable]
class LegalForm extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'legal_forms';

    protected $fillable = [
        'code',
        'name',
        'description',
        'requires_capital',
        'active',
    ];

    protected $casts = [
        'requires_capital' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['code', 'name', 'description'];
    public static array $filterable = ['active', 'requires_capital'];
    public static array $sortable = ['id', 'code', 'name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parties'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['legal_forms', 'lookups'];

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }
}
