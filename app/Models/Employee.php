<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Employee extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes, Auditable;

    protected $table = 'employees';

    protected $fillable = [
        'company_id',
        'matricule',
        'user_id',
        'first_name',
        'last_name',
        'nss',
        'birth_date',
        'gender_id',
        'rib',
        'bank_name',
        'hire_date',
        'termination_date',
        'employment_status',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'hire_date' => 'date',
        'termination_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['matricule', 'first_name', 'last_name', 'nss'];
    public static array $filterable = ['gender_id', 'employment_status', 'company_id'];
    public static array $sortable = ['id', 'matricule', 'first_name', 'last_name', 'hire_date'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['user', 'gender', 'contracts', 'company'];
    public static string $defaultSort = 'first_name';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['employees'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(EmploymentContract::class);
    }
    // في Employee.php
    protected static function booted()
    {
        static::creating(function ($employee) {
            if (auth()->check()) {
                $employee->created_by = auth()->id();
            }
        });
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function scopeActive($query)
    {
        return $query->where('employment_status', 'active');
    }
}