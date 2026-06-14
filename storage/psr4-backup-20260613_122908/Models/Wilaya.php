<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class Wilaya extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'wilayas';

    protected $fillable = [
        'code',
        'name',
        'arabic_name',
        'latitude',
        'longitude',
        'active',
    ];

    protected $casts = [
        'code' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'arabic_name'];
    public static array $filterable = ['active', 'code'];
    public static array $sortable = ['id', 'code', 'name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['communes', 'users', 'parties', 'warehouses'];
    public static string $defaultSort = 'code';
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['wilayas', 'geography'];

    public function communes(): HasMany { return $this->hasMany(Commune::class); }
    public function users(): HasMany { return $this->hasMany(User::class); }
    public function parties(): HasMany { return $this->hasMany(Party::class); }
    public function warehouses(): HasMany { return $this->hasMany(Warehouse::class); }
}