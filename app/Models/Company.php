<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

#[Cacheable]
class Company extends Model
{
    use HasStandardizedConfiguration, Auditable;

    protected $table = 'companies';

    protected $fillable = [
        'name', 'commercial_name', 'slug', 'activity',
        'rc', 'rc_date', 'nif', 'nis', 'ai', 'legal_form_id', 'capital_amount',
        'address', 'commune_id', 'wilaya_id', 'phone', 'mobile', 'fax', 'email', 'avatar',
        'bank_name', 'rib',
        'owner_id', 'created_by', 'is_active',
        'suspended_at', 'suspension_reason', 'suspended_by',
        'deactivated_at', 'deactivated_by',
        'plan', 'trial_ends_at', 'max_users', 'max_warehouses', 'max_products',
        'verified_at', 'verified_by', 'notes', 'settings_json',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'capital_amount' => 'decimal:4',
        'rc_date' => 'date',
        'suspended_at' => 'datetime',
        'deactivated_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'verified_at' => 'datetime',
        'max_users' => 'integer',
        'max_warehouses' => 'integer',
        'max_products' => 'integer',
        'settings_json' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['is_operational', 'is_suspended', 'is_verified', 'is_on_trial', 'trial_days_remaining'];

    public static array $searchableFields = ['name', 'commercial_name', 'nif', 'rc', 'email', 'phone'];
    public static array $filterable = ['is_active', 'plan', 'legal_form_id', 'wilaya_id', 'owner_id'];
    public static array $sortable = ['id', 'name', 'plan', 'created_at', 'trial_ends_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['owner', 'legalForm', 'wilaya', 'commune', 'activeUsers', 'suspendedBy', 'deactivatedBy', 'verifiedBy'];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 20;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['companies'];

    public const PLANS = [
        'free'         => ['max_users' => 3,   'max_warehouses' => 1,  'max_products' => 500],
        'starter'      => ['max_users' => 10,  'max_warehouses' => 2,  'max_products' => 2000],
        'professional' => ['max_users' => 25,  'max_warehouses' => 5,  'max_products' => 10000],
        'enterprise'   => ['max_users' => 999, 'max_warehouses' => 99, 'max_products' => 999999],
    ];

    public const MEMBER_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];
    public const COMPANY_ROLE_OWNER   = 'owner';
    public const COMPANY_ROLE_ADMIN   = 'admin';
    public const COMPANY_ROLE_MANAGER = 'manager';
    public const COMPANY_ROLE_MEMBER  = 'member';
    public const COMPANY_ROLE_VIEWER  = 'viewer';

    protected static function booted(): void
    {
        static::creating(function (self $company): void {
            if (empty($company->slug)) {
                $company->slug = self::generateUniqueSlug($company->name);
            }
            if (empty($company->created_by) && auth()->check()) {
                $company->created_by = auth()->id();
            }
            $plan = $company->plan ?? 'free';
            if (isset(self::PLANS[$plan])) {
                $limits = self::PLANS[$plan];
                $company->max_users      ??= $limits['max_users'];
                $company->max_warehouses ??= $limits['max_warehouses'];
                $company->max_products   ??= $limits['max_products'];
            }
            if ($plan === 'free' && empty($company->trial_ends_at)) {
                $company->trial_ends_at = now()->addDays(14);
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function legalForm(): BelongsTo
    {
        return $this->belongsTo(LegalForm::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    public function deactivatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deactivated_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['is_default', 'role', 'invited_by', 'joined_at', 'is_active'])
            ->withTimestamps();
    }

    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('is_active', true);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function fiscalYears(): HasMany
    {
        return $this->hasMany(FiscalYear::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->whereNull('suspended_at');
    }

    public function scopeSuspended(Builder $query): Builder
    {
        return $query->whereNotNull('suspended_at');
    }

    public function scopeDeactivated(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    public function scopeVerified(Builder $query): Builder
    {
        return $query->whereNotNull('verified_at');
    }

    public function scopeOnTrial(Builder $query): Builder
    {
        return $query->whereNotNull('trial_ends_at')->where('trial_ends_at', '>', now());
    }

    public function scopeTrialExpired(Builder $query): Builder
    {
        return $query->whereNotNull('trial_ends_at')->where('trial_ends_at', '<=', now())->where('plan', 'free');
    }

    public function scopeOnPlan(Builder $query, string $plan): Builder
    {
        return $query->where('plan', $plan);
    }

    public function getIsOperationalAttribute(): bool
    {
        return $this->is_active && is_null($this->suspended_at);
    }

    public function getIsSuspendedAttribute(): bool
    {
        return !is_null($this->suspended_at);
    }

    public function getIsVerifiedAttribute(): bool
    {
        return !is_null($this->verified_at);
    }

    public function getIsOnTrialAttribute(): bool
    {
        return !is_null($this->trial_ends_at) && $this->trial_ends_at->isFuture();
    }

    public function getTrialDaysRemainingAttribute(): ?int
    {
        if (!$this->is_on_trial) return null;
        return (int) now()->diffInDays($this->trial_ends_at);
    }

    public function getCurrentUsersCountAttribute(): int
    {
        return $this->activeUsers()->count();
    }

    public function getIsAtUsersLimitAttribute(): bool
    {
        return $this->current_users_count >= $this->max_users;
    }

    public function suspend(string $reason, int $byUserId): void
    {
        $this->update([
            'suspended_at'      => now(),
            'suspension_reason' => $reason,
            'suspended_by'      => $byUserId,
        ]);
    }

    public function unsuspend(): void
    {
        $this->update([
            'suspended_at'      => null,
            'suspension_reason' => null,
            'suspended_by'      => null,
        ]);
    }

    public function deactivate(int $byUserId): void
    {
        $this->update([
            'is_active'      => false,
            'deactivated_at' => now(),
            'deactivated_by' => $byUserId,
        ]);
    }

    public function activate(): void
    {
        $this->update([
            'is_active'         => true,
            'deactivated_at'    => null,
            'deactivated_by'    => null,
            'suspended_at'      => null,
            'suspension_reason' => null,
            'suspended_by'      => null,
        ]);
    }

    public function verify(int $byUserId): void
    {
        $this->update(['verified_at' => now(), 'verified_by' => $byUserId]);
    }

    public function unverify(): void
    {
        $this->update(['verified_at' => null, 'verified_by' => null]);
    }

    public function transferOwnership(int $newOwnerId): void
    {
        User::findOrFail($newOwnerId);
        if (!$this->users()->where('users.id', $newOwnerId)->exists()) {
            $this->users()->attach($newOwnerId, [
                'is_default' => false,
                'role'       => 'owner',
                'joined_at'  => now(),
                'is_active'  => true,
            ]);
        } else {
            $this->users()->updateExistingPivot($newOwnerId, ['role' => 'owner']);
        }
        if ($this->owner_id && $this->owner_id !== $newOwnerId) {
            $this->users()->updateExistingPivot($this->owner_id, ['role' => 'admin']);
        }
        $this->update(['owner_id' => $newOwnerId]);
    }

    public function upgradePlan(string $plan, ?array $customLimits = null): void
    {
        abort_unless(array_key_exists($plan, self::PLANS), 422, 'خطة غير معروفة');
        $limits = array_merge(self::PLANS[$plan], $customLimits ?? []);
        $this->update([
            'plan'           => $plan,
            'max_users'      => $limits['max_users'],
            'max_warehouses' => $limits['max_warehouses'],
            'max_products'   => $limits['max_products'],
        ]);
    }

    public function addMember(int $userId, string $role = 'member', ?int $invitedBy = null): void
    {
        abort_if($this->is_at_users_limit, 422, "وصلت الشركة للحد الأقصى من المستخدمين ({$this->max_users}).");
        $this->users()->syncWithoutDetaching([
            $userId => [
                'role'       => $role,
                'invited_by' => $invitedBy,
                'joined_at'  => now(),
                'is_active'  => true,
            ],
        ]);
    }

    public function removeMember(int $userId): void
    {
        abort_if($userId === $this->owner_id, 422, 'لا يمكن إزالة مالك الشركة.');
        $this->users()->detach($userId);
    }

    public function deactivateMember(int $userId): void
    {
        abort_if($userId === $this->owner_id, 422, 'لا يمكن تعطيل مالك الشركة.');
        $this->users()->updateExistingPivot($userId, ['is_active' => false]);
    }

    public function activateMember(int $userId): void
    {
        $this->users()->updateExistingPivot($userId, ['is_active' => true]);
    }

    public function changeMemberRole(int $userId, string $role): void
    {
        abort_if($userId === $this->owner_id && $role !== 'owner', 422, 'لا يمكن تغيير دور المالك — استخدم transferOwnership().');
        $this->users()->updateExistingPivot($userId, ['role' => $role]);
    }

    public static function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        if (empty($base)) {
            $base = 'company-' . Str::random(6);
        }
        $slug = $base;
        $i = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $i <= 3 ? "{$base}-{$i}" : "{$base}-" . Str::random(6);
            $i++;
        }
        return $slug;
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings_json, $key, $default);
    }

    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings_json ?? [];
        data_set($settings, $key, $value);
        $this->update(['settings_json' => $settings]);
    }

    public function isAdmin(User $user): bool
    {
        $pivot = $this->users()->where('user_id', $user->id)->first()?->pivot;
        return $pivot && in_array($pivot->role, ['owner', 'admin']);
    }
}