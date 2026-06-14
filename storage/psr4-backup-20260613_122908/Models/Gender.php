<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Gender extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'genders';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['genders', 'lookups'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = ['active'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}