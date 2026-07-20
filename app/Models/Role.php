<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use App\Core\Traits\HasStandardizedConfiguration;

class Role extends SpatieRole
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'company_id',
        'name',
        'guard_name',
        'display_name',
        'description',
    ];

    public static array $searchableFields = ['name', 'display_name', 'description'];
    public static array $filterable = ['guard_name', 'company_id'];
    public static array $sortable = ['id', 'name', 'display_name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['permissions', 'users'];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['roles', 'permissions'];
    public static array $scopes = [];
    public static int $defaultPerPage = 100;
    public static int $perPageLimit = 200;
}