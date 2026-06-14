<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class FiscalStamp extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'fiscal_stamps';

    protected $fillable = [
        'company_id',
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

    public static array $searchableFields = ['name', 'stamp_value', 'type'];
    public static array $filterable = ['active', 'type', 'valid_from', 'valid_to'];
    public static array $sortable = ['id', 'name', 'stamp_value', 'min_amount'];
    public static array $allowedIncludes = [];
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['fiscal_stamps', 'api'];
}