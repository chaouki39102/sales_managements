# Module Export: Company
Generated at: 2026-05-30 12:21:19

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Company.php
```php
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
        'owner_id', 'created_by', 'active',
        'suspended_at', 'suspension_reason', 'suspended_by',
        'deactivated_at', 'deactivated_by',
        'plan', 'trial_ends_at', 'max_users', 'max_warehouses', 'max_products',
        'verified_at', 'verified_by', 'notes', 'settings_json',
    ];

    protected $casts = [
        'active' => 'boolean',
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
    public static array $filterable = ['active', 'plan', 'legal_form_id', 'wilaya_id', 'owner_id'];
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
            ->withPivot(['is_default', 'role', 'invited_by', 'joined_at', 'active'])
            ->withTimestamps();
    }

    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('active', true);
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
        return $query->where('active', true)->whereNull('suspended_at');
    }

    public function scopeSuspended(Builder $query): Builder
    {
        return $query->whereNotNull('suspended_at');
    }

    public function scopeDeactivated(Builder $query): Builder
    {
        return $query->where('active', false);
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
        return $this->active && is_null($this->suspended_at);
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
            'active'      => false,
            'deactivated_at' => now(),
            'deactivated_by' => $byUserId,
        ]);
    }

    public function activate(): void
    {
        $this->update([
            'active'         => true,
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
                'active'  => true,
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
                'active'  => true,
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
        $this->users()->updateExistingPivot($userId, ['active' => false]);
    }

    public function activateMember(int $userId): void
    {
        $this->users()->updateExistingPivot($userId, ['active' => true]);
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
```

### 📁 D:\xampp\htdocs\sales-management\app\Models\Scopes\CompanyScope.php
```php
<?php
// app/Models/Scopes/CompanyScope.php
namespace App\Models\Scopes;

use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // استخدام Service Container وليس session() مباشرة
        $context = app(CompanyContextService::class);

        if ($context->has()) {
            $builder->where(
                $model->getTable() . '.company_id',
                $context->get()
            );
        }
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models\Traits\HasCompany.php
```php
<?php
// app/Models/Traits/HasCompany.php
namespace App\Models\Traits;

use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasCompany
{
    /**
     * يُستدعى تلقائياً عند boot() للنموذج
     * اسم الدالة bootHasCompany() هو اتفاقية Laravel للـ Traits
     */
    protected static function bootHasCompany(): void
    {
        // 1. تطبيق الـ Global Scope على كل query
        static::addGlobalScope(new CompanyScope());

        // 2. تعيين company_id تلقائياً عند الإنشاء
        static::creating(function (self $model): void {
            if (empty($model->company_id)) {
                $context = app(CompanyContextService::class);
                if ($context->has()) {
                    $model->company_id = $context->get();
                }
            }
        });
    }

    // ===== Relations =====

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // ===== Scopes =====

    /**
     * تجاهل فلتر الشركة — للتقارير الموحدة أو Super Admin
     */
    public function scopeAllCompanies(Builder $query): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * جلب بيانات شركة محددة بغض النظر عن السياق الحالي
     */
    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class)
                     ->where($this->getTable() . '.company_id', $companyId);
    }
}

```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\Admin\AdminCompanyController.php
```php
<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->withCount('users')
            ->with('owner:id,name,email');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            match ($status) {
                'active'     => $query->where('active', true)->whereNull('suspended_at'),
                'suspended'  => $query->whereNotNull('suspended_at'),
                'inactive'   => $query->where('active', false),
                'verified'   => $query->whereNotNull('verified_at'),
                'unverified' => $query->whereNull('verified_at'),
                default      => null,
            };
        }

        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }

        $sortBy = in_array($request->get('sort_by'), ['name', 'created_at', 'users_count'])
                    ? $request->get('sort_by')
                    : 'created_at';
        $sortDir = $request->get('sort_dir', 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        $companies = $query->paginate($request->get('per_page', 20));
        $items = CompanyResource::collection($companies);

        return response()->json([
            'data'  => $items->collection,
            'meta'  => [
                'current_page' => $companies->currentPage(),
                'last_page'    => $companies->lastPage(),
                'per_page'     => $companies->perPage(),
                'total'        => $companies->total(),
                'from'         => $companies->firstItem(),
                'to'           => $companies->lastItem(),
            ],
            'links' => [
                'first' => $companies->url(1),
                'last'  => $companies->url($companies->lastPage()),
                'prev'  => $companies->previousPageUrl(),
                'next'  => $companies->nextPageUrl(),
            ],
        ]);
    }

    public function show(Company $company): JsonResponse
    {
        $company->loadCount('users')->load('owner:id,name,email');
        return response()->json([
            'data' => new CompanyResource($company)
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:100',
            'plan' => 'required|in:free,starter,professional,enterprise',
            'max_users'      => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
        ]);

        $company = Company::create($data + ['owner_id' => auth()->id()]);
        return response()->json([
            'data' => new CompanyResource($company)
        ], 201);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:100',
            'active' => 'sometimes|boolean',
        ]);

        $company->update($data);
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function destroy(Company $company): JsonResponse
    {
        $company->delete();
        return response()->json(null, 204);
    }

    public function suspend(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $company->suspend($data['reason'], auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function unsuspend(Company $company): JsonResponse
    {
        $company->unsuspend();
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function activate(Company $company): JsonResponse
    {
        $company->activate();
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function deactivate(Company $company): JsonResponse
    {
        $company->deactivate(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function verify(Company $company): JsonResponse
    {
        $company->verify(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function unverify(Company $company): JsonResponse
    {
        $company->unverify();
        return response()->json(['message' => 'تم إلغاء التوثيق']);
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['required', 'string', 'in:free,starter,professional,enterprise'],
            'max_users'      => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
        ]);

        $customLimits = array_filter([
            'max_users'      => $data['max_users']      ?? null,
            'max_warehouses' => $data['max_warehouses'] ?? null,
            'max_products'   => $data['max_products']   ?? null,
        ]);

        $company->upgradePlan($data['plan'], $customLimits ?: null);
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:5000']);
        $company->update(['notes' => $data['notes']]);
        return response()->json(['message' => 'تم تحديث الملاحظات']);
    }

    public function users(Request $request, Company $company): JsonResponse
    {
        $users = $company->users()
            ->withPivot(['role', 'active', 'created_at'])
            ->orderByPivot('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        $items = UserResource::collection($users);

        return response()->json([
            'data'  => $items->collection,
            'meta'  => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'from'         => $users->firstItem(),
                'to'           => $users->lastItem(),
            ],
            'links' => [
                'first' => $users->url(1),
                'last'  => $users->url($users->lastPage()),
                'prev'  => $users->previousPageUrl(),
                'next'  => $users->nextPageUrl(),
            ],
        ]);
    }

    public function addUser(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|max:50',
        ]);

        if (DB::table('company_user')->where('company_id', $company->id)->where('user_id', $data['user_id'])->exists()) {
            return response()->json(['message' => 'المستخدم موجود بالفعل'], 422);
        }

        $company->users()->attach($data['user_id'], [
            'role'       => $data['role'] ?? 'member',
            'active'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'تمت إضافة المستخدم للشركة'], 201);
    }

    public function removeUser(Company $company, User $user): JsonResponse
    {
        $company->users()->detach($user->id);
        return response()->json(['message' => 'تم إزالة المستخدم من الشركة']);
    }

    public function toggleUserStatus(Company $company, User $user): JsonResponse
    {
        $membership = DB::table('company_user')
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'المستخدم ليس عضواً في هذه الشركة'], 404);
        }

        $newStatus = !$membership->active;
        DB::table('company_user')
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->update(['active' => $newStatus, 'updated_at' => now()]);

        return response()->json([
            'data'    => ['active' => $newStatus],
            'message' => $newStatus ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
        ]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\Admin\CompanyController.php
```php
<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin Company Controller
 *
 * جميع العمليات هنا مقتصرة على Super Admin فقط.
 * يمدد BaseApiController لاستخدام أدوات الاستجابة الموحدة ومعالجة الأخطاء.
 */
class CompanyController extends BaseApiController
{
    protected string $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(private CompanyService $companyService)
    {
       // parent::__construct();
    }

    /**
     * إحصائيات عامة عن كل الشركات
     */
    public function stats(): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            return $this->successResponse(
                $this->companyService->getStats(),
                'إحصائيات جميع الشركات'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'stats');
        }
    }

    public function suspend(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['reason' => 'required|string|max:500']);
            $company->suspend($data['reason'], auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تعليق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unsuspend();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم رفع التعليق عن شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function deactivate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->deactivate(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إيقاف تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivate');
        }
    }

    public function activate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->activate();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إعادة تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activate');
        }
    }

    public function verify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->verify(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم توثيق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unverify();
            return $this->successResponse(null, 'تم إلغاء توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);
            $customLimits = array_filter([
                'max_users'      => $data['max_users'] ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products'] ?? null,
            ]);
            $company->upgradePlan($data['plan'], $customLimits ?: null);
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تغيير خطة [{$company->name}] إلى {$data['plan']}"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePlan');
        }
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['notes' => 'nullable|string|max:5000']);
            $company->update(['notes' => $data['notes']]);
            return $this->successResponse(null, 'تم تحديث الملاحظات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateNotes');
        }
    }

    // ======================  تجاوز (override) getService() و getModelClass() ======================
    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\CompanyController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CompanyController extends BaseApiController
{
    protected string $resourceName = 'company';

    public function __construct(private CompanyService $companyService)
    {
        parent::__construct();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. شركات المستخدم الحالي
    // ═══════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $companies = $user->companies()
                ->with(['legalForm', 'wilaya', 'commune'])
                ->orderBy('name')
                ->get();

            return $this->successResponse($companies, 'تم جلب قائمة الشركات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function current(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $companyId = $user->company_id;

            if (!$companyId) {
                return $this->errorResponse('لا توجد شركة نشطة', 404, 'NO_ACTIVE_COMPANY');
            }

            $company = Company::with(['legalForm', 'wilaya', 'commune'])
                ->where('active', true)
                ->findOrFail($companyId);

            return $this->successResponse($company);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. CRUD – استخدام الـ Service مع الـ slug
    // ═══════════════════════════════════════════════════════════════════

    public function show($id): JsonResponse
    {
        try {
            $company = $this->companyService->findBySlug($id);
            $company->load(['legalForm', 'wilaya', 'commune']);
            return $this->successResponse($company);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        try {
            $company = DB::transaction(function () use ($request) {
                $validated = $request->validated();
                $slug = \Illuminate\Support\Str::slug($validated['name']) . '-' . substr(md5(uniqid()), 0, 8);

                $company = $this->companyService->create([
                    ...$validated,
                    'slug'   => $slug,
                    'active' => true,
                    'plan'   => 'free',
                ], $request);

                // إضافة المالك (already done in afterCreate hook of CompanyService)
                return $company;
            });

            return $this->successResponse($company, 'تم إنشاء الشركة بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(UpdateCompanyRequest $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $company = $this->companyService->findBySlug($id);

            // صلاحية التعديل
            if (!$user->hasRole('super-admin')) {
                $isAuthorized = DB::table('company_user')
                    ->where('user_id', $user->id)
                    ->where('company_id', $company->id)
                    ->whereIn('role', ['owner', 'admin'])
                    ->exists();

                if (!$isAuthorized) {
                    return $this->errorResponse('ليس لديك صلاحية تعديل هذه الشركة', 403);
                }
            }

            $validated = $request->validated();
            unset($validated['slug'], $validated['company_id']);

            $company = $this->companyService->update($company, $validated, $request);
            $company->load(['legalForm', 'wilaya', 'commune']);

            return $this->successResponse($company, 'تم تحديث بيانات الشركة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $company = $this->companyService->findBySlug($id);

            if ($company->users()->count() > 1) {
                return $this->errorResponse('لا يمكن حذف شركة بها أعضاء', 422);
            }

            $this->companyService->delete($company);
            return $this->successResponse(null, 'تم حذف الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. تبديل الشركة النشطة
    // ═══════════════════════════════════════════════════════════════════

    public function switch(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'company_id' => 'required|integer|exists:companies,id',
            ]);

            $user = Auth::user();
            $companyId = $validated['company_id'];

            if (!$user->hasRole('super-admin')) {
                $isMember = DB::table('company_user')
                    ->where('user_id', $user->id)
                    ->where('company_id', $companyId)
                    ->where('active', true)
                    ->exists();

                if (!$isMember) {
                    return $this->errorResponse('ليس لديك صلاحية الوصول لهذه الشركة', 403);
                }
            }

            $user->update(['company_id' => $companyId]);

            return $this->successResponse(['company_id' => $companyId], 'تم تبديل الشركة النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. إدارة الأعضاء – استخدام Service
    // ═══════════════════════════════════════════════════════════════════

    public function members($id): JsonResponse
    {
        try {
            $this->authorizeMemberAccess($id);
            $members = $this->companyService->getMembersBySlug($id);
            return $this->successResponse($members);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'members');
        }
    }

    public function addMember(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
                'role'    => 'nullable|string|in:admin,manager,member,viewer',
            ]);

            $this->authorizeMemberAccess($id);
            $this->companyService->addMemberBySlug($id, $validated['user_id'], $validated['role'] ?? 'member');

            return $this->successResponse(null, 'تم إضافة العضو بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'addMember');
        }
    }

    public function removeMember($id, int $userId): JsonResponse
    {
        try {
            $this->authorizeMemberAccess($id);
            $this->companyService->removeMemberBySlug($id, $userId);
            return $this->successResponse(null, 'تم حذف العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'removeMember');
        }
    }

    public function changeMemberRole(Request $request, $id, int $userId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'role' => 'required|string|in:admin,manager,member,viewer',
            ]);

            $this->authorizeMemberAccess($id);

            DB::table('company_user')
                ->where('company_id', $this->companyService->findBySlug($id)->id)
                ->where('user_id', $userId)
                ->where('role', '!=', 'owner')
                ->update(['role' => $validated['role'], 'updated_at' => now()]);

            return $this->successResponse(null, 'تم تغيير الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changeMemberRole');
        }
    }

    public function activateMember($id, int $userId): JsonResponse
    {
        try {
            $this->authorizeMemberAccess($id);

            DB::table('company_user')
                ->where('company_id', $this->companyService->findBySlug($id)->id)
                ->where('user_id', $userId)
                ->update(['active' => true, 'updated_at' => now()]);

            return $this->successResponse(null, 'تم تفعيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activateMember');
        }
    }

    public function deactivateMember($id, int $userId): JsonResponse
    {
        try {
            $this->authorizeMemberAccess($id);

            DB::table('company_user')
                ->where('company_id', $this->companyService->findBySlug($id)->id)
                ->where('user_id', $userId)
                ->where('role', '!=', 'owner')
                ->update(['active' => false, 'updated_at' => now()]);

            return $this->successResponse(null, 'تم تعطيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivateMember');
        }
    }

    public function transferOwnership(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
            ]);

            $company = $this->companyService->findBySlug($id);
            $currentOwner = Auth::id();
            $newOwner = (int) $validated['user_id'];

            DB::transaction(function () use ($company, $currentOwner, $newOwner) {
                DB::table('company_user')
                    ->where('company_id', $company->id)
                    ->where('user_id', $currentOwner)
                    ->update(['role' => 'admin', 'updated_at' => now()]);

                DB::table('company_user')
                    ->where('company_id', $company->id)
                    ->where('user_id', $newOwner)
                    ->update(['role' => 'owner', 'active' => true, 'updated_at' => now()]);
            });

            return $this->successResponse(null, 'تم نقل ملكية الشركة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'transferOwnership');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. إجراءات أخرى
    // ═══════════════════════════════════════════════════════════════════

    public function updateAvatar(Request $request, string $slug): JsonResponse
    {
        try {
            $company = Company::where('slug', $slug)->firstOrFail();
            $request->validate(['avatar' => 'required|image|max:2048']);

            $path = $request->file('avatar')->store("companies/{$slug}/avatars", 'public');
            $company->update(['avatar' => "/storage/{$path}"]);

            return $this->successResponse(['avatar' => $company->avatar], 'تم رفع الشعار بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateAvatar');
        }
    }

    public function suspend($id): JsonResponse
    {
        $company = $this->companyService->findBySlug($id);
        $company->update(['suspended_at' => now()]);
        return $this->successResponse(null, 'تم تعليق الشركة');
    }

    public function unsuspend($id): JsonResponse
    {
        $company = $this->companyService->findBySlug($id);
        $company->update(['suspended_at' => null]);
        return $this->successResponse(null, 'تم رفع التعليق');
    }

    public function verify($id): JsonResponse
    {
        $company = $this->companyService->findBySlug($id);
        $company->update(['verified_at' => now()]);
        return $this->successResponse(null, 'تم توثيق الشركة');
    }

    public function unverify($id): JsonResponse
    {
        $company = $this->companyService->findBySlug($id);
        $company->update(['verified_at' => null]);
        return $this->successResponse(null, 'تم إلغاء التوثيق');
    }

    public function upgradePlan(Request $request, $id): JsonResponse
    {
        $company = $this->companyService->findBySlug($id);
        $validated = $request->validate(['plan' => 'required|string|in:free,starter,professional,enterprise']);
        $company->update(['plan' => $validated['plan']]);
        return $this->successResponse(null, 'تم تغيير الخطة');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. دوال مساعدة خاصة
    // ═══════════════════════════════════════════════════════════════════

    private function authorizeMemberAccess(string $slug): void
    {
        $user = Auth::user();
        if ($user->hasRole('super-admin')) {
            return;
        }

        $company = $this->companyService->findBySlug($slug);
        $isMember = DB::table('company_user')
            ->where('user_id', $user->id)
            ->where('company_id', $company->id)
            ->exists();

        if (!$isMember) {
            throw new \App\Core\Exceptions\UnauthorizedException('ليس لديك صلاحية الوصول لأعضاء هذه الشركة');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. تجاوز دوال BaseApiController
    // ═══════════════════════════════════════════════════════════════════

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\CompanySeedController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\DocumentBaseOperationSeeder;
use Database\Seeders\DocumentStatusSeeder;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\ExpenseCategorySeeder;
use Database\Seeders\FiscalStampSeeder;
use Database\Seeders\InventoryValuationMethodSeeder;
use Database\Seeders\LegalFormSeeder;
use Database\Seeders\NumberingSeriesSeeder;
use Database\Seeders\PartyTypeSeeder;
use Database\Seeders\PaymentModeSeeder;
use Database\Seeders\PriceLevelSeeder;
use Database\Seeders\ProductTypeSeeder;
use Database\Seeders\StockMovementTypeSeeder;
use Database\Seeders\TreasuryAccountSeeder;
use Database\Seeders\TreasuryAccountTypeSeeder;
use Database\Seeders\TvaSeeder;
use Database\Seeders\UnitSeeder;
use Database\Seeders\WarehouseSeeder;
use Database\Seeders\WilayaCommuneSeeder;

class CompanySeedController extends Controller
{
    private const SEEDERS = [
        'currencies'                  => [CurrencySeeder::class,                  'currencies'],
        'tvas'                        => [TvaSeeder::class,                        'tvas'],
        'units'                       => [UnitSeeder::class,                       'units'],
        'legal-forms'                 => [LegalFormSeeder::class,                  'legal_forms'],
        'fiscal-stamps'               => [FiscalStampSeeder::class,                'fiscal_stamps'],
        'price-levels'                => [PriceLevelSeeder::class,                 'price_levels'],
        'party-types'                 => [PartyTypeSeeder::class,                  'party_types'],
        'product-types'               => [ProductTypeSeeder::class,                'product_types'],
        'stock-movement-types'        => [StockMovementTypeSeeder::class,          'stock_movement_types'],
        'treasury-account-types'      => [TreasuryAccountTypeSeeder::class,        'treasury_account_types'],
        'document-base-operations'    => [DocumentBaseOperationSeeder::class,      'document_base_operations'],
        'document-statuses'           => [DocumentStatusSeeder::class,             'document_statuses'],
        'document-types'              => [DocumentTypeSeeder::class,               'document_types'],
        'inventory-valuation-methods' => [InventoryValuationMethodSeeder::class,   'inventory_valuation_methods'],
        'warehouses'                  => [WarehouseSeeder::class,                  'warehouses'],
        'treasury-accounts'           => [TreasuryAccountSeeder::class,            'treasury_accounts'],
        'payment-modes'               => [PaymentModeSeeder::class,                'payment_modes'],
        'expense-categories'          => [ExpenseCategorySeeder::class,            'expense_categories'],
        'numbering-series'            => [NumberingSeriesSeeder::class,            'numbering_series'],
        // ✅ إضافة wilayas-communes (كان مفقوداً)
        'wilayas-communes'            => [WilayaCommuneSeeder::class,              'wilayas'],
    ];

    public function run(Company $company, string $seeder): JsonResponse
    {
        // ✅ الإصلاح: استبدال authorize('manage') بتحقق مباشر من الـ permission
        // authorize('manage', $company) كانت تبحث عن CompanyPolicy@manage غير موجودة → 403
        $user = request()->user();

        // السوبر أدمن يمر دائماً
        if (!$user->hasRole('super-admin')) {
            // تحقق أن المستخدم مالك الشركة أو عضو نشط
            $membership = DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->where('active', true)
                ->first();

            if (!$membership) {
                return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
            }

            // تحقق من permission manage_lookups أو update_company
            if (!$user->can('manage_lookups') && !$user->can('update_company')) {
                return response()->json(['message' => 'ليس لديك صلاحية بذر البيانات.'], 403);
            }
        }

        if (!isset(self::SEEDERS[$seeder])) {
            return response()->json(['message' => 'seeder غير معروف: ' . $seeder], 404);
        }

        [$class, $table] = self::SEEDERS[$seeder];

        // التحقق من وجود بيانات مسبقة — تجاهل إذا كان الجدول عالمياً (wilayas, legal_forms...)
        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        if (!in_array($table, $globalTables)) {
            if (DB::table($table)->where('company_id', $company->id)->exists()) {
                return response()->json(['message' => 'البيانات موجودة مسبقاً للشركة']);
            }
        } else {
            // للجداول العالمية: تحقق بدون company_id
            if (DB::table($table)->exists()) {
                return response()->json(['message' => 'البيانات العالمية موجودة مسبقاً']);
            }
        }

        config(['seeding.company_id' => $company->id]);

        return $this->execute($class);
    }

public function seedAll(Company $company): JsonResponse
{
    $user = request()->user();

    if (!$user->hasRole('super-admin')) {
        $membership = DB::table('company_user')
            ->where('user_id', $user->id)
            ->where('company_id', $company->id)
            ->where('active', true)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
        }
    }

    $ordered = array_keys(self::SEEDERS);
    $applied = [];
    $skipped = [];

    foreach ($ordered as $key) {
        [$class, $table] = self::SEEDERS[$key];

        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        $exists = in_array($table, $globalTables)
            ? DB::table($table)->exists()
            : DB::table($table)->where('company_id', $company->id)->exists();

        if ($exists) {
            $skipped[] = $key;
            continue;
        }

        try {
            config(['seeding.company_id' => $company->id]);
            (new $class)->run();
            $applied[] = $key;
        } catch (\Throwable $e) {
            logger()->error("SeedAll فشل ($key) للشركة {$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => "فشل تطبيق {$key}: " . $e->getMessage(),
                'applied' => $applied,
                'skipped' => $skipped,
            ], 500);
        }
    }

    // ✅ تعيين دور admin للمالك بعد اكتمال السيد
    $owner = \App\Models\User::find($company->owner_id);
    if ($owner) {
        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $company->id)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    return response()->json([
        'message' => 'تم تطبيق جميع البيانات الأساسية بنجاح',
        'applied' => $applied,
        'skipped' => $skipped,
    ]);
}

    private function execute(string $class): JsonResponse
    {
        try {
            DB::transaction(fn () => (new $class)->run());
            return response()->json(['message' => 'تم التطبيق بنجاح']);
        } catch (\Throwable $e) {
            logger()->error('CompanySeedController فشل: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\CompanyContextService.php
```php
<?php
// app/Services/CompanyContextService.php
namespace App\Services;

class CompanyContextService
{
    private ?int $companyId = null;

    public function set(int $id): void
    {
        $this->companyId = $id;
    }

    public function get(): ?int
    {
        return $this->companyId;
    }

    public function has(): bool
    {
        return $this->companyId !== null;
    }

    public function clear(): void
    {
        $this->companyId = null;
    }

    /**
     * تنفيذ كود ضمن سياق شركة مؤقت — مفيد للـ Jobs والـ Artisan Commands
     */
    public function runAs(int $companyId, callable $callback): mixed
    {
        $previous = $this->companyId;
        $this->companyId = $companyId;

        try {
            return $callback();
        } finally {
            $this->companyId = $previous;
        }
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\CompanyRoleService.php
```php
<?php

namespace App\Services;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CompanyRoleService
 * ══════════════════════════════════════════════════════════════════
 * خدمة إنشاء وإدارة الأدوار والصلاحيات لكل شركة في نظام Multi-Tenancy.
 *
 * تُستدعى في:
 *  1. CompanyObserver::created()  ← تلقائياً عند إنشاء شركة جديدة
 *  2. RolesAndPermissionsSeeder   ← عند التهيئة الأولى للنظام
 *  3. Console command: php artisan company:seed-roles {company_id}
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyRoleService
{
    // ─────────────────────────────────────────────────────────────
    // نقطة الدخول الرئيسية
    // ─────────────────────────────────────────────────────────────

    /**
     * إنشاء أدوار الشركة الجديدة وتعيين صلاحياتها.
     * آمنة للاستدعاء المتعدد (idempotent).
     */
    public function seedRoles(int $companyId): void
    {
        DB::transaction(function () use ($companyId) {

            $this->createCompanyRoles($companyId);
            $this->assignPermissionsToRoles($companyId);

            // مسح الكاش بعد أي تعديل على الأدوار/الصلاحيات
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("✅ [CompanyRoleService] تم إنشاء أدوار الشركة #{$companyId}");
        });
    }

    /**
     * تعيين دور معيّن لمستخدم داخل شركة.
     */
    public function assignRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->firstOrFail();

        // Spatie يسمح بأدوار متعددة — نُحدّد دور الشركة الواحدة فقط
        $user->assignRole($role);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * إزالة دور مستخدم داخل شركة معيّنة.
     */
    public function removeRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->first();

        if ($role) {
            $user->removeRole($role);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * جلب الدور الحالي للمستخدم داخل شركة.
     */
    public function getUserRole(User $user, int $companyId): ?Role
    {
        return $user->roles()
            ->where('company_id', $companyId)
            ->first();
    }

    /**
     * التحقق من أن المستخدم يملك دوراً محدداً في شركة.
     */
    public function hasRole(User $user, string $roleName, int $companyId): bool
    {
        return $user->roles()
            ->where('name', $roleName)
            ->where('company_id', $companyId)
            ->exists();
    }

    // ─────────────────────────────────────────────────────────────
    // إنشاء الأدوار
    // ─────────────────────────────────────────────────────────────

    private function createCompanyRoles(int $companyId): void
    {
        foreach ($this->getRolesDefinition() as $roleData) {
            Role::firstOrCreate(
                [
                    'name'       => $roleData['name'],
                    'guard_name' => 'web',
                    'company_id' => $companyId,
                ],
                [
                    'display_name' => $roleData['display_name'],
                    'description'  => $roleData['description'] ?? '',
                ]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعيين الصلاحيات للأدوار
    // ─────────────────────────────────────────────────────────────

    private function assignPermissionsToRoles(int $companyId): void
    {
        $globalPerms = Permission::whereNull('company_id')->get()->keyBy('name');

        foreach ($this->getRolePermissionsMap() as $roleName => $permNames) {

            $role = Role::where('name', $roleName)
                ->where('company_id', $companyId)
                ->where('guard_name', 'web')
                ->first();

            if (! $role) {
                Log::warning("[CompanyRoleService] الدور '{$roleName}' غير موجود للشركة #{$companyId}");
                continue;
            }

            $perms = $globalPerms->only($permNames)->values();
            $role->syncPermissions($perms);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعريف الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolesDefinition(): array
    {
        return [
            [
                'name'         => 'admin',
                'display_name' => 'مدير الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'محاسب',
                'description'  => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية',
            ],
            [
                'name'         => 'salesperson',
                'display_name' => 'بائع',
                'description'  => 'إنشاء مستندات البيع وإدارة الزبائن',
            ],
            [
                'name'         => 'warehouse',
                'display_name' => 'أمين المخزن',
                'description'  => 'إدارة المخزون وحركاته',
            ],
            [
                'name'         => 'viewer',
                'display_name' => 'مشاهد',
                'description'  => 'قراءة فقط بدون أي صلاحيات كتابة',
            ],
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // خريطة صلاحيات الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolePermissionsMap(): array
    {
        return [

            // ══════════════════════════════════════════════════════
            // مدير الشركة — صلاحيات كاملة على موارد الشركة
            // ══════════════════════════════════════════════════════
            'admin' => [
                // المستخدمون
                'view_any_user', 'view_user', 'create_user', 'update_user', 'delete_user',
                'restore_user', 'force_delete_user', 'toggle_active_user',
                'change_password_user', 'assign_role_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party',
                'delete_party', 'restore_party', 'force_delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'restore_product', 'manage_product_prices',
                'manage_product_variants', 'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'create_warehouse',
                'update_warehouse', 'delete_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                'manage_numbering_series',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                'delete_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'delete_stock_movement', 'view_any_product_lot', 'manage_product_lot',
                'manage_opening_balances',
                // الموظفون
                'view_any_employee', 'view_employee', 'create_employee',
                'update_employee', 'delete_employee', 'manage_employment_contracts',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية
                'view_any_fiscal_year', 'manage_fiscal_year',
                // الإعدادات
                'manage_settings', 'manage_lookups', 'manage_attachments', 'view_audit_log',
                // الأدوار
                'view_roles', 'manage_roles',
                // الشركة
                'view_company', 'update_company', 'manage_company_members', 'transfer_ownership',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث — عملات وتقييم وما إلى ذلك
                'view_any_currency',  'create_currency',  'update_currency',  'delete_currency',
                'view_any_tva',       'create_tva',       'update_tva',       'delete_tva',
                'view_any_unit',      'create_unit',      'update_unit',      'delete_unit',
                'view_any_family',    'create_family',    'update_family',    'delete_family',
                'view_any_brand',     'create_brand',     'update_brand',     'delete_brand',
                'view_any_price_level',  'create_price_level',  'update_price_level',  'delete_price_level',
                'view_any_payment_mode', 'create_payment_mode', 'update_payment_mode', 'delete_payment_mode',
                'view_any_expense_category', 'create_expense_category', 'update_expense_category', 'delete_expense_category',
                'view_any_exchange_rate',    'create_exchange_rate',    'update_exchange_rate',    'delete_exchange_rate',
                'view_any_document_type',    'create_document_type',    'update_document_type',    'delete_document_type',
                'view_any_document_status',  'create_document_status',  'update_document_status',  'delete_document_status',
                'view_any_gender',      'create_gender',      'update_gender',      'delete_gender',
                'view_any_legal_form',  'create_legal_form',  'update_legal_form',  'delete_legal_form',
                'view_any_party_type',  'create_party_type',  'update_party_type',  'delete_party_type',
                'view_any_product_type','create_product_type','update_product_type','delete_product_type',
                'view_any_treasury_account_type',  'create_treasury_account_type',  'update_treasury_account_type',  'delete_treasury_account_type',
                'view_any_stock_movement_type',    'create_stock_movement_type',    'update_stock_movement_type',    'delete_stock_movement_type',
                'view_any_inventory_valuation_method', 'create_inventory_valuation_method', 'update_inventory_valuation_method', 'delete_inventory_valuation_method',
            ],

            // ══════════════════════════════════════════════════════
            // مدير العمليات — عمليات يومية شاملة بدون إعدادات حساسة
            // ══════════════════════════════════════════════════════
            'manager' => [
                // المستخدمون (قراءة فقط)
                'view_any_user', 'view_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party', 'delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'manage_product_prices', 'manage_product_variants',
                'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'update_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense',
                // الخزينة (قراءة فقط)
                'view_any_treasury_account', 'view_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // الموظفون (قراءة فقط)
                'view_any_employee', 'view_employee',
                // التقارير (كاملة)
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_lookups', 'manage_attachments', 'view_roles', 'view_company',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_tva', 'view_any_unit', 'view_any_family',
                'view_any_brand', 'view_any_price_level', 'view_any_payment_mode',
                'view_any_expense_category', 'view_any_exchange_rate',
                'view_any_document_type', 'view_any_document_status',
            ],

            // ══════════════════════════════════════════════════════
            // المحاسب — مالية وتقارير بدون تعديل بيانات تجارية
            // ══════════════════════════════════════════════════════
            'accountant' => [
                // الأطراف (قراءة)
                'view_any_party', 'view_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (تأكيد فقط)
                'view_any_commercial_document', 'view_commercial_document',
                'validate_commercial_document',
                // المدفوعات (كاملة)
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات (كاملة)
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات (كاملة)
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة (إدارة)
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_financial_report',
                'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_payment_mode', 'view_any_expense_category',
                'view_any_exchange_rate', 'view_any_treasury_account_type',
            ],

            // ══════════════════════════════════════════════════════
            // البائع — مبيعات وزبائن فقط
            // ══════════════════════════════════════════════════════
            'salesperson' => [
                // الأطراف (إنشاء وتعديل)
                'view_any_party', 'view_party', 'create_party', 'update_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات البيع فقط
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'update_commercial_document',
                'duplicate_commercial_document',
                // المدفوعات (قراءة + إنشاء)
                'view_any_payment', 'view_payment', 'create_payment',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement',
                // التقارير المتعلقة بالمبيعات
                'view_sales_report', 'view_party_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_price_level', 'view_any_payment_mode', 'view_any_tva',
                'view_any_unit', 'view_any_family', 'view_any_brand',
            ],

            // ══════════════════════════════════════════════════════
            // أمين المخزن — مخزون فقط
            // ══════════════════════════════════════════════════════
            'warehouse' => [
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (قراءة فقط)
                'view_any_commercial_document', 'view_commercial_document',
                // المخزون (كامل)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // التقارير
                'view_inventory_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_unit', 'view_any_family', 'view_any_brand',
                'view_any_stock_movement_type', 'view_any_inventory_valuation_method',
            ],

            // ══════════════════════════════════════════════════════
            // المشاهد — قراءة فقط بلا استثناء
            // ══════════════════════════════════════════════════════
            'viewer' => [
                'view_any_party', 'view_party',
                'view_any_product', 'view_product',
                'view_any_warehouse', 'view_warehouse',
                'view_any_commercial_document', 'view_commercial_document',
                'view_any_payment', 'view_payment',
                'view_any_check', 'view_check',
                'view_any_expense', 'view_expense',
                'view_any_treasury_account', 'view_treasury_account',
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                'view_any_employee', 'view_employee',
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                'view_any_fiscal_year', 'view_roles', 'view_company',
                'view_any_notification',
            ],
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\CompanyService.php
```php
<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\Log;

class CompanyService extends \App\Core\Services\BaseService
{
    protected string $model        = Company::class;
    protected string $resourceName = 'company';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'company';
    }

    public function __construct(private ?CompanyContextService $context = null) {}

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
        }
        $data['owner_id']  = auth()->id();
        $data['active'] = $data['active'] ?? true;
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // ربط المالك بالشركة في الجدول الوسيط
        $ownerId = $data['owner_id'] ?? auth()->id();

        DB::table('company_user')->insertOrIgnore([
            'user_id'    => $ownerId,
            'company_id' => $item->id,
            'role'       => 'owner',
            'active'     => true,
            'is_default' => true,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // باقي المهام (بذر الأدوار وتعيين دور admin للمالك) يتولاها CompanyObserver تلقائياً
        Log::info("Company created: {$item->name}, owner: {$ownerId}");
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        Log::info("New company created: {$item->name} by User#" . auth()->id());
    }

    // ═══════════════════════════════════════════
    // تبديل السياق — switchContext
    // ═══════════════════════════════════════════

    public function switchContext(User $user, Company $company): void
    {
        // ① super-admin يتجاوز كل التحقق — لديه صلاحية الوصول لأي شركة
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            $this->applyContext($user, $company);
            return;
        }

        // ② التحقق من العضوية النشطة للمستخدمين العاديين
        $membership = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->first();

        if (!$membership) {
            throw new BusinessRuleException(
                'أنت لست عضواً في هذه الشركة.',
                403
            );
        }

        if (!$membership->active) {
            throw new BusinessRuleException(
                'حسابك معطّل داخل هذه الشركة. تواصل مع المسؤول.',
                403
            );
        }

        if (!$company->active) {
            throw new BusinessRuleException(
                'هذه الشركة غير مفعّلة حالياً.',
                403
            );
        }

        $this->applyContext($user, $company);
    }

    /**
     * تطبيق السياق فعلياً بعد التحقق
     */
    private function applyContext(User $user, Company $company): void
    {
        // ضبط CompanyContextService
        if (!$this->context) {
            $this->context = app(CompanyContextService::class);
        }
        $this->context->set($company->id);

        // تحديث is_default في الـ pivot (إن كان المستخدم عضواً)
        $isMember = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->exists();

        if ($isMember) {
            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->update(['is_default' => true]);

            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', '!=', $company->id)
                ->update(['is_default' => false]);
        }

        // تحديث company_id في جدول users
        $user->update(['company_id' => $company->id]);
    }

    // ═══════════════════════════════════════════
    // دوال مساعدة
    // ═══════════════════════════════════════════

    public function getUserCompanies()
    {
        return auth()->user()->companies()->get();
    }

    public function getMembers(Company $company)
    {
        return $company->users()
            ->withPivot(['role', 'active', 'joined_at'])
            ->get();
    }

    public function getStats(): array
    {
        return [
            'total_companies'     => Company::count(),
            'active_companies'    => Company::active()->count(),
            'suspended_companies' => Company::suspended()->count(),
            'verified_companies'  => Company::verified()->count(),
            'on_trial_companies'  => Company::onTrial()->count(),
            'plans_distribution'  => Company::select('plan', DB::raw('COUNT(*) as total'))
                ->groupBy('plan')
                ->pluck('total', 'plan')
                ->toArray(),
        ];
    }


    /**
     * البحث عن شركة باستخدام slug
     */
    public function findBySlug(string $slug): Company
    {
        return Company::where('slug', $slug)->firstOrFail();
    }

    /**
     * تحديث شركة باستخدام slug
     */
    public function updateBySlug(string $slug, array $data, ?Request $request = null): Company
    {
        $company = $this->findBySlug($slug);
        return $this->update($company, $data, $request);
    }

    /**
     * حذف شركة باستخدام slug
     */
    public function deleteBySlug(string $slug, ?Request $request = null): bool
    {
        $company = $this->findBySlug($slug);
        return $this->delete($company, $request);
    }

    /**
     * جلب أعضاء الشركة
     */
    public function getMembersBySlug(string $slug): array
    {
        $company = $this->findBySlug($slug);

        return DB::table('company_user as cu')
            ->join('users as u', 'cu.user_id', '=', 'u.id')
            ->where('cu.company_id', $company->id)
            ->select([
                'cu.id',
                'cu.user_id',
                'cu.role',
                'cu.active',
                'cu.joined_at',
                'u.name',
                'u.email',
                'u.avatar',
            ])
            ->orderBy('cu.role')
            ->get()
            ->map(fn($row) => [
                'id'        => $row->id,
                'user_id'   => $row->user_id,
                'role'      => $row->role,
                'active'    => (bool) $row->active,
                'joined_at' => $row->joined_at,
                'user'      => [
                    'id'     => $row->user_id,
                    'name'   => $row->name,
                    'email'  => $row->email,
                    'avatar' => $row->avatar,
                ],
            ])
            ->values()
            ->toArray();
    }

    /**
     * إضافة عضو إلى الشركة
     */
    public function addMemberBySlug(string $slug, int $userId, string $role = 'member'): void
    {
        $company = $this->findBySlug($slug);

        $exists = DB::table('company_user')
            ->where('user_id', $userId)
            ->where('company_id', $company->id)
            ->exists();

        if ($exists) {
            DB::table('company_user')
                ->where('user_id', $userId)
                ->where('company_id', $company->id)
                ->update(['role' => $role, 'active' => true, 'updated_at' => now()]);
            return;
        }

        DB::table('company_user')->insert([
            'user_id'    => $userId,
            'company_id' => $company->id,
            'role'       => $role,
            'active'     => true,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * إزالة عضو من الشركة (باستثناء المالك)
     */
    public function removeMemberBySlug(string $slug, int $userId): void
    {
        $company = $this->findBySlug($slug);

        $deleted = DB::table('company_user')
            ->where('company_id', $company->id)
            ->where('user_id', $userId)
            ->where('role', '!=', 'owner')
            ->delete();

        if (!$deleted) {
            throw new BusinessRuleException('لا يمكن حذف مالك الشركة أو العضو غير موجود', 422);
        }
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreCompanyRequest.php
```php
<?php
// app/Http/Requests/StoreCompanyRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => 'required|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string|max:500',
            'tax_number'      => 'nullable|string|max:50',
            'nif'             => 'nullable|string|max:50|unique:companies,nif',
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الشركة مطلوب',
            'nif.unique'    => 'رقم التعريف الجبائي موجود بالفعل',
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateCompanyRequest.php
```php
<?php
// app/Http/Requests/UpdateCompanyRequest.php

namespace App\Http\Requests;

use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // نحصل على الـ company إما من route parameter (slug) أو من الـ id الممرر
        $company = $this->route('company');

        // إذا كان $company كائن Company (route model binding) نأخذ id
        // وإلا نبحث عن الشركة باستخدام slug من الرابط
        if ($company instanceof Company) {
            $companyId = $company->id;
        } else {
            // في حالة استخدام slug كمعامل (الوضع الحالي في routes)
            $slug = $this->route('company') ?? $this->route('id');
            $company = Company::where('slug', $slug)->first();
            $companyId = $company?->id;
        }

        $rules = [
            'name'            => 'sometimes|string|max:150',
            'commercial_name' => 'nullable|string|max:150',
            'activity'        => 'nullable|string|max:500',
            'email'           => ['nullable', 'email', 'max:100', Rule::unique('companies')->ignore($companyId)],
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'fax'             => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',
            'nif'             => ['nullable', 'string', 'max:50', Rule::unique('companies')->ignore($companyId)],
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'rc_date'         => 'nullable|date',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'capital_amount'  => 'nullable|numeric|min:0',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'bank_name'       => 'nullable|string|max:100',
            'rib'             => 'nullable|string|max:30',
        ];

        // صلاحيات السوبر أدمن فقط
        if (auth()->user()?->hasRole('super-admin')) {
            $rules['plan']           = ['nullable', 'string', Rule::in(['free', 'starter', 'professional', 'enterprise'])];
            $rules['max_users']      = 'nullable|integer|min:1';
            $rules['max_warehouses'] = 'nullable|integer|min:1';
            $rules['max_products']   = 'nullable|integer|min:1';
            $rules['notes']          = 'nullable|string|max:2000';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'هذا البريد الإلكتروني مستخدم من قبل شركة أخرى',
            'nif.unique'   => 'رقم NIF مستخدم من قبل شركة أخرى',
            'plan.in'      => 'الخطة غير صحيحة',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\CompanyPolicy.php
```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

/**
 * سياسة الصلاحيات الخاصة بالشركات
 *
 * ملاحظة: صلاحيات Super Admin و Admin تُدار عن طريق Gate::before في AppServiceProvider،
 * لذلك تركز هذه السياسة فقط على المستخدمين العاديين.
 */
class CompanyPolicy
{
    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض قائمة الشركات.
     * العائد true يعني السماح، مع فلترة البيانات حسب صلاحيته في الـ Controller.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض شركة معينة.
     * يسمح إذا كان المستخدم مالكاً أو عضواً نشطاً في الشركة.
     */
    public function view(User $user, Company $company): bool
    {
        return $user->hasAccessToCompany($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه إنشاء شركة جديدة.
     * أي مستخدم مصادق يمكنه إنشاء شركة (يمكن تخصيص القيود لاحقاً).
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه تحديث بيانات الشركة.
     * يسمح للمالك أو للمدير (admin) فقط.
     */
    public function update(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company) || $company->isAdmin($user);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه حذف (إيقاف) الشركة.
     * يسمح فقط للمالك.
     */
    public function delete(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه إدارة أعضاء الشركة (إضافة/إزالة/تغيير دور).
     * يسمح للمالك أو للمدير (admin).
     */
    public function manageMember(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company) || $company->isAdmin($user);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه نقل ملكية الشركة.
     * يسمح فقط للمالك الحالي.
     */
    public function transferOwnership(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه تبديل الشركة النشطة (السياق).
     * يسمح لأي مستخدم لديه حق الوصول للشركة (مالك أو عضو نشط).
     */
    public function switch(User $user, Company $company): bool
    {
        return $user->hasAccessToCompany($company);
    }

    /**
     * صلاحية خاصة للسوبر أدمن (تُستخدم في إجراءات الإدارة العليا).
     * مع وجود Gate::before، هذه الدالة قد لا تُستدعى أبداً للسوبر أدمن،
     * لكن نُبقيها للوضوح وللتأكد من عدم السماح لغير السوبر أدمن.
     */
    public function superAdmin(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}

```

