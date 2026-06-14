<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class StockMovementType extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'stock_movement_types';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'description',
        'direction',
        'active',
        'display_order',
    ];

    protected $casts = [
        'direction' => 'integer',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active', 'direction'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['stockMovements'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['stock_movement_types', 'lookups'];

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isIncoming(): bool { return $this->direction === 1; }
    public function isOutgoing(): bool { return $this->direction === -1; }
    public function isNeutral(): bool { return $this->direction === 0; }
}