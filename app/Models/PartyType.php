<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * PartyType Model
 *
 * Table: party_types
 * Lookup table for party types (customer, supplier, both)
 */
#[Cacheable]
class PartyType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'party_types';

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['party_types', 'lookups'];

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }
}
