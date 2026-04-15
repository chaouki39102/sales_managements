<?php

namespace App\Models;


use Spatie\Permission\Models\Permission as SpatiePermission;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Permission Model (extends Spatie)
 *
 * Table: permissions
 */
class Permission extends SpatiePermission
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'group',
        'description',
    ];

    public static array $searchableFields = ['name', 'display_name', 'description'];
    public static array $filterable = ['guard_name', 'group'];
    public static array $sortable = ['id', 'name', 'display_name', 'group'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['roles'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['permissions'];

    public function scopeByGroup($query, string $group)
    {
        return $query->where('group', $group);
    }
}
