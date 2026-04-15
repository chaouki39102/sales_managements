<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class FiscalStamp extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'min_amount',
        'max_amount',
        'stamp_value',
        'type',
        'active',
        'valid_from',
        'valid_to',
    ];

    protected $casts = [
        'min_amount' => 'decimal:4',
        'max_amount' => 'decimal:4',
        'stamp_value' => 'decimal:4',
        'active' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'stamp_value', 'type'];
    public static array $filterable = ['active', 'type', 'valid_from', 'valid_to'];
    public static array $sortable = ['id', 'name', 'stamp_value', 'min_amount'];
    public static array $allowedIncludes = [];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['fiscal_stamps', 'api'];
}
