<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class Commune extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'communes';

    protected $fillable = [
        'post_code',
        'name',
        'arabic_name',
        'wilaya_id',
        'latitude',
        'longitude',
        'active',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'arabic_name', 'post_code'];
    public static array $filterable = ['wilaya_id', 'active'];
    public static array $sortable = ['id', 'name', 'post_code'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['wilaya', 'users', 'parties', 'warehouses'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['communes', 'geography'];

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }
}