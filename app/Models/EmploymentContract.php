<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class EmploymentContract extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'employment_contracts';

    protected $fillable = [
        'company_id',
        'employee_id',
        'contract_type',
        'start_date',
        'end_date',
        'base_salary',
        'job_title',
        'department',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'base_salary' => 'decimal:4',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['job_title', 'department'];
    public static array $filterable = ['employee_id', 'contract_type', 'is_active'];
    public static array $sortable = ['id', 'start_date', 'end_date', 'base_salary'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['employee'];
    public static string $defaultSort = 'start_date';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['employment_contracts'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}