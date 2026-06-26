<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes, HasStandardizedConfiguration;

    public const ROLE_SUPER_ADMIN = 'super-admin';
    public const ROLE_ADMIN = 'admin';
    public const COMPANY_ROLE_OWNER = 'owner';
    public const COMPANY_ROLE_ADMIN = 'admin';
    public const COMPANY_ROLE_MEMBER = 'member';

    protected $table = 'users';

    protected $fillable = [
        'name', 'email', 'email_verified_at', 'username', 'phone', 'avatar',
        'bio', 'job_title', 'birth_date', 'gender_id', 'national_id', 'address',
        'commune_id', 'wilaya_id', 'role_id', 'last_login_at', 'last_login_ip',
        'register_ip', 'register_user_agent', 'active', 'created_by', 'updated_by', 'deleted_by','password',
    ];

    protected $hidden = ['password', 'remember_token', 'national_id'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'birth_date' => 'date',
        'last_login_at' => 'datetime',
        'active'            => 'boolean',
        'is_approved'       => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['full_address'];

    protected $guard_name = 'web';

    public static array $searchableFields = ['name', 'email', 'username', 'phone', 'job_title'];
    public static array $filterable = ['gender_id', 'commune_id', 'wilaya_id', 'role_id', 'active'];
    public static array $sortable = ['id', 'name', 'email', 'created_at', 'last_login_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'gender', 'commune', 'wilaya', 'role', 'roles', 'permissions',
        'createdBy', 'updatedBy', 'deletedBy', 'commercialDocuments',
        'payments', 'stockMovements', 'companies'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['users'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function gender(): BelongsTo { return $this->belongsTo(Gender::class); }
    public function commune(): BelongsTo { return $this->belongsTo(Commune::class); }
    public function wilaya(): BelongsTo { return $this->belongsTo(Wilaya::class); }
    public function role(): BelongsTo { return $this->belongsTo(\Spatie\Permission\Models\Role::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function updatedBy(): BelongsTo { return $this->belongsTo(User::class, 'updated_by'); }
    public function deletedBy(): BelongsTo { return $this->belongsTo(User::class, 'deleted_by'); }
    public function commercialDocuments(): HasMany { return $this->hasMany(CommercialDocument::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function stockMovements(): HasMany { return $this->hasMany(StockMovement::class); }
    public function expenses(): HasMany { return $this->hasMany(Expense::class, 'created_by'); }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class)
            ->withPivot('is_default', 'role', 'invited_by', 'joined_at', 'active')
            ->withTimestamps();
    }

    public function defaultCompany(): BelongsTo { return $this->belongsTo(Company::class, 'company_id'); }



    public function getDefaultCompanyAttribute() { return $this->companies()->wherePivot('is_default', true)->first(); }
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([$this->address, $this->commune?->name, $this->wilaya?->name]);
        return implode(', ', $parts);
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now(), 'last_login_ip' => request()->ip()]);
    }

    public function isAdmin(): bool { return $this->hasRole(self::ROLE_ADMIN); }
    public function isSuperAdmin(): bool { return $this->hasRole(self::ROLE_SUPER_ADMIN); }

    public function hasAccessToCompany(int|Company $company): bool
    {
        $id = $company instanceof Company ? $company->id : $company;
        if ($this->relationLoaded('companies')) {
            $member = $this->companies->firstWhere('id', $id);
            return $member && $member->pivot->active;
        }
        return $this->companies()->where('companies.id', $id)->wherePivot('active', true)->exists();
    }

    public function isOwnerOf(Company $company): bool { return $this->id === $company->owner_id; }

    public function isAdminOf(Company $company): bool
    {
        if ($this->relationLoaded('companies')) {
            $member = $this->companies->firstWhere('id', $company->id);
            return $member && $member->pivot->active && in_array($member->pivot->role, [self::COMPANY_ROLE_OWNER, self::COMPANY_ROLE_ADMIN]);
        }
        return $this->companies()
            ->where('companies.id', $company->id)
            ->wherePivot('active', true)
            ->wherePivotIn('role', [self::COMPANY_ROLE_OWNER, self::COMPANY_ROLE_ADMIN])
            ->exists();
    }
}
