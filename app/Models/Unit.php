<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Unit extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'units';

    protected $fillable = [
        'company_id',
        'name',
        'symbol',
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

    public static array $searchableFields = ['name', 'symbol', 'description'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['units', 'lookups'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    protected static function boot(): void
{
    parent::boot();

    static::creating(function (self $model): void {
        $model->slug = static::uniqueSlug($model->name, $model->company_id);
    });

    static::updating(function (self $model): void {
        if ($model->isDirty('name')) {
            $model->slug = static::uniqueSlug($model->name, $model->company_id, $model->id);
        }
    });
}

public static function uniqueSlug(string $name, int $companyId, ?int $ignoreId = null): string
{
    $slug = \Illuminate\Support\Str::slug($name) ?: preg_replace('/\s+/u', '-', trim(mb_strtolower($name)));
    $originalSlug = $slug;
    $count = 1;

    while (\Illuminate\Support\Facades\DB::table('units_of_measure')
        ->where('slug', $slug)
        ->when($ignoreId, function ($query) use ($ignoreId) {
            return $query->where('id', '!=', $ignoreId);
        })
        ->exists()
    ) {
        $slug = $originalSlug . '-' . $count++;
    }

    return $slug;
}
}
