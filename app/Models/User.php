<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * User Model
 *
 * Table: users
 * Manages system users with authentication and profile management
 */
#[Cacheable]
class User extends Authenticatable
{
    use HasApiTokens,
        HasFactory,
        Notifiable,
        HasRoles,
        SoftDeletes,
        HasStandardizedConfiguration;

    protected $table = 'users';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'username',
        'phone',
        'avatar',
        'bio',
        'job_title',
        'birth_date',
        'gender_id',
        'national_id',
        'address',
        'commune_id',
        'wilaya_id',
        'role_id',
        'last_login_at',
        'last_login_ip',
        'register_ip',
        'register_user_agent',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    // -------------------- Hidden --------------------
    protected $hidden = [
        'password',
        'remember_token',
        'national_id',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'email_verified_at' => 'datetime',
        'birth_date' => 'date',
        'last_login_at' => 'datetime',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['full_address'];

    // -------------------- Spatie Permission --------------------
    protected $guard_name = 'web';

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'email',
        'username',
        'phone',
        'job_title',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'gender_id',
        'commune_id',
        'wilaya_id',
        'role_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'email',
        'created_at',
        'last_login_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'gender',
        'commune',
        'wilaya',
        'role',
        'roles',
        'permissions',
        'createdBy',
        'updatedBy',
        'deletedBy',
        'commercialDocuments',
        'payments',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['users'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'created_by');
    }

    // -------------------- Mutators --------------------

    public function setPasswordAttribute($value)
    {
        if (strlen($value) === 60 && str_starts_with($value, '$2y$')) {
            $this->attributes['password'] = $value;
            return;
        }
        $this->attributes['password'] = \Illuminate\Support\Facades\Hash::make($value);
    }

    // -------------------- Accessors --------------------

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }

    // -------------------- Helpers --------------------

    public function updateLastLogin(): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }
}
