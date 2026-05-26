# Module Export: User
Generated at: 2026-05-26 10:04:02

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\User.php
```php
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
        'active' => 'boolean',
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

```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\Admin\AdminUserController.php
```php
<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Resources\CompanyResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount('companies');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($request->has('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($role = $request->get('role')) {
            $query->where('role', $role);
        }

        $users = $query->latest()->paginate($request->get('per_page', 20));
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role'     => 'nullable|in:super_admin,admin,user',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role'     => $data['role'] ?? 'user',
            'active'   => true,
        ]);

        if ($request->filled('company_id')) {
            $user->companies()->attach($request->company_id, [
                'role'       => 'member',
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'data' => new UserResource($user)
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount('companies');
        return response()->json([
            'data' => new UserResource($user)
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role'  => 'nullable|in:super_admin,admin,user',
        ]);

        $user->update($data);
        return response()->json([
            'data' => new UserResource($user->fresh())
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'لا يمكنك حذف حسابك الخاص'], 422);
        }
        $user->delete();
        return response()->json(null, 204);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete();
        return response()->json(['message' => 'تم تغيير كلمة المرور وإلغاء جميع الجلسات']);
    }

    public function toggleActive(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'لا يمكنك تعطيل حسابك الخاص'], 422);
        }

        $user->update(['active' => !$user->active]);
        return response()->json([
            'data'    => new UserResource($user->fresh()),
            'message' => $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم'
        ]);
    }

    public function companies(User $user): JsonResponse
    {
        $companies = $user->companies()->withPivot(['role', 'active'])->get();
        return response()->json([
            'data' => CompanyResource::collection($companies)
        ]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\UserController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseApiController
{
    protected string  $resourceName = 'user';
    protected ?string $resourceClass = UserResource::class;

    public function __construct(private UserService $userService)
    {
        parent::__construct();
    }

    protected function getService(): UserService
    {
        return $this->userService;
    }

    protected function getModelClass(): string
    {
        return User::class;
    }

    public function index(Request $request): JsonResponse
{
    $companyId = app(\App\Services\CompanyContextService::class)->get();

    $users = User::whereHas('companies', function ($q) use ($companyId) {
        $q->where('companies.id', $companyId);
    })->paginate($request->get('per_page', 15));

    return $this->successResponse(
        UserResource::collection($users),
        'تم جلب المستخدمين بنجاح'
    );
}

    // ─────────────────────────────────────────────────────────────────
    // السبب الجذري للمشكلة:
    //
    // الـ route هو: /{company}/{user}
    // Laravel يمرر parameters بالترتيب للـ method signature:
    //   BaseApiController::update(Request $request, $id)
    //                                                ↑
    //                                         يستقبل {company} بدل {user}!
    //
    // الحل: قراءة {user} مباشرة من الـ route بالاسم، وليس من الـ $id.
    // نحافظ على نفس signature للـ parent لتجنب خطأ PHP type compatibility.
    // ─────────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;

            $item = $this->userService->findById($userId);
            $this->authorizeAction('update', $item);

            $data = $this->getValidatedData($request, $userId);
            $item = $this->userService->update($item, $data, $request);

            return $this->successResponse(
                new UserResource($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // show و destroy يعانيان من نفس مشكلة {company}/{user} parameter mixing
    public function show($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('view', $item);
            return $this->successResponse(new UserResource($item));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('delete', $item);
            $this->userService->delete($item);
            return $this->successResponse(null, "تم حذف {$this->resourceName} بنجاح");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ─── الملف الشخصي ───────────────────────────────────────────────

    public function profile(Request $request): JsonResponse
    {
        try {
            // ✅ نحمّل roles + permissions لتظهر في تبويب الصلاحيات
            $user = $request->user()->load(['gender', 'commune', 'wilaya', 'roles', 'permissions']);
            return $this->successResponse(new UserResource($user));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'profile');
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'       => 'sometimes|string|max:255',
                'username'   => 'nullable|string|max:50',
                'phone'      => 'nullable|string|max:20',
                'bio'        => 'nullable|string',
                'birth_date' => 'nullable|date',
                'gender_id'  => 'nullable|exists:genders,id',
                'address'    => 'nullable|string|max:500',
                'commune_id' => 'nullable|exists:communes,id',
                'wilaya_id'  => 'nullable|exists:wilayas,id',
            ]);
            $user = $this->userService->updateProfile($request->user(), $data);
            return $this->successResponse(new UserResource($user), 'تم تحديث الملف الشخصي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateProfile');
        }
    }

    // ─── عمليات على مستخدم محدد ─────────────────────────────────────

    public function changePassword(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $data = $request->validate(['password' => 'required|string|min:8|max:100']);
            $this->userService->changePassword($user, $data['password']);
            return $this->successResponse(null, 'تم تغيير كلمة المرور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    public function toggleActive($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $user = $this->userService->toggleActive($user);
            $msg  = $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user), $msg);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleActive');
        }
    }

    public function assignRole(Request $request, $id): JsonResponse
{
    try {
        $userId = $request->route('user') ?? $id;
        $user   = $this->userService->findById($userId);
        $this->authorizeAction('update', $user);

        $companyId = app(\App\Services\CompanyContextService::class)->get();

        $data = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        app(\App\Services\CompanyRoleService::class)
            ->assignRole($user, $data['role'], $companyId);

        return $this->successResponse(
            new UserResource($user->load('roles')),
            'تم تعيين الدور'
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'assignRole');
    }
}

    // ─── المحذوفات ──────────────────────────────────────────────────

    public function trashed(): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', User::class);
            $users = User::onlyTrashed()
                ->where('company_id', app(\App\Services\CompanyContextService::class)->get())
                ->with(['roles', 'gender'])
                ->paginate(20);
            return $this->successResponse(UserResource::collection($users));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'trashed');
        }
    }

    public function restore($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->restoreUser($userId);
            $this->authorizeAction('restore', $user);
            return $this->successResponse(new UserResource($user), 'تم استعادة المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'restore');
        }
    }

    public function forceDelete($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = User::withTrashed()->findOrFail($userId);
            $this->authorizeAction('forceDelete', $user);
            $this->userService->forceDeleteUser($userId);
            return $this->successResponse(null, 'تم حذف المستخدم نهائياً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'forceDelete');
        }
    }

    // ─── استعلامات ──────────────────────────────────────────────────

    public function byRole(Request $request): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $role = $request->get('role');
        if (!$role) return $this->errorResponse('الرجاء تحديد دور', 422);
        return $this->successResponse(UserResource::collection($this->userService->getByRole($role)));
    }

    public function active(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getActive()));
    }

    public function inactive(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getInactive()));
    }
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\UserService.php
```php
<?php

namespace App\Services;

use App\Models\User;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UserService extends \App\Core\Services\BaseService
{
    protected string $model        = User::class;
    protected string $resourceName = 'user';
    protected array  $defaultWith  = ['roles', 'gender', 'commune', 'wilaya'];

    protected function getResourceName(): string
    {
        return 'user';
    }

    // ═══════════════════════════════════════════
    // تجاوز update() لحل مشكلة permission_ids
    // ═══════════════════════════════════════════
    // المشكلة: BaseService::update() يحذف permission_ids في prepareDataForUpdate
    // ثم يمرر $data بدونها لـ afterUpdate — فلا تُحفظ الصلاحيات أبداً.
    // الحل: نتجاوز update() ونعالج permission_ids قبل استدعاء الـ parent.

    public function update(Model $item, array $data, Request $request = null): Model
    {
        // نستخرج permission_ids قبل أن يأخذها BaseService ويفقدها
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null; // null = لم تُرسل (لا تغيير)

        // نستدعي الـ parent الذي يعالج باقي الحقول
        $item = parent::update($item, $data, $request);

        // نطبق الصلاحيات بعد الحفظ مباشرة
        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
        }

        return $item->fresh($this->defaultWith);
    }

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $companyId          = $this->getCurrentCompanyId();
        $data['company_id'] = $companyId;
        $data['created_by'] = auth()->id();
        $data['active']     ??= true;

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $this->validateUniqueEmail($data['email'], $companyId);

        if (!empty($data['username'])) {
            $this->validateUniqueUsername($data['username']);
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        $companyId = $this->getCurrentCompanyId();

        // 1. ربط المستخدم بالشركة الحالية عبر company_user
        $item->companies()->attach($companyId, [
            'role'       => $data['role'] ?? 'member',
            'is_default' => false,
            'joined_at'  => now(),
            'active'     => true,
        ]);

        // 2. تعيين الدور المحاسبي (Spatie) باستخدام CompanyRoleService
        if (!empty($data['role'])) {
            app(\App\Services\CompanyRoleService::class)
                ->assignRole($item, $data['role'], $companyId);
        }

        // 3. الصلاحيات المباشرة (إن وجدت)
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }

        // 4. رفع الصورة (إن وجدت)
        if (!empty($data['avatar_file'])) {
            $this->handleAvatarUpload($item, $data['avatar_file']);
        }

        Log::info('User created and attached to company', [
            'user_id'    => $item->id,
            'company_id' => $companyId,
        ]);
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['company_id']) && (int)$data['company_id'] !== (int)$item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالمستخدم.', 422);
        }

        if ($request && auth()->id() === $item->id && isset($data['role'])) {
            throw new BusinessRuleException('لا يمكنك تغيير دورك الخاص.', 422);
        }

        if (isset($data['email']) && $data['email'] !== $item->email) {
            $this->validateUniqueEmail($data['email'], $item->company_id, $item->id);
        }

        if (isset($data['username']) && $data['username'] !== $item->username) {
            $this->validateUniqueUsername($data['username'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['company_id']);
        unset($data['permission_ids']); // تُعالج في update() المُتجاوَز

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        unset($data['avatar_file']);

        $data['updated_by'] = auth()->id();

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // الدور
        if (isset($data['role']) && $data['role']) {
            $item->syncRoles([$data['role']]);
        }

        // permission_ids تُعالج في update() المُتجاوَز — لا شيء هنا

        if ($request && $request->hasFile('avatar_file')) {
            $this->handleAvatarUpload($item, $request->file('avatar_file'));
        }

        Log::info('User updated', ['user_id' => $item->id]);
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك حذف حسابك الخاص.', 422);
        }
    }

    protected function afterDelete(Model $item): void
    {
        $item->update(['deleted_by' => auth()->id()]);
        Log::info('User soft deleted', ['user_id' => $item->id]);
    }

    // ═══════════════════════════════════════════
    // العمليات المتقدمة
    // ═══════════════════════════════════════════

    public function changePassword(User $user, string $newPassword): void
    {
        $user->update([
            'password'   => Hash::make($newPassword),
            'updated_by' => auth()->id(),
        ]);
    }

    public function toggleActive(User $user): User
    {
        if ($user->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك تعطيل حسابك الخاص.', 422);
        }

        $user->active     = !$user->active;
        $user->updated_by = auth()->id();
        $user->save();

        return $user->fresh($this->defaultWith);
    }

    public function updateProfile(User $user, array $data): User
    {
        $allowed  = [
            'name',
            'username',
            'phone',
            'bio',
            'avatar',
            'birth_date',
            'gender_id',
            'address',
            'commune_id',
            'wilaya_id'
        ];
        $filtered = array_intersect_key($data, array_flip($allowed));

        if (isset($filtered['username']) && $filtered['username'] !== $user->username) {
            $this->validateUniqueUsername($filtered['username'], $user->id);
        }

        $user->update($filtered);

        return $user->fresh($this->defaultWith);
    }

    public function updateAvatar(User $user, $file): string
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
        return Storage::disk('public')->url($path);
    }

    public function updateLastLogin(User $user): void
    {
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function restoreUser(int $id): User
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->trashed()) {
            $user->restore();
            $user->update(['deleted_by' => null]);
            Log::info('User restored', ['user_id' => $id]);
        }
        return $user->fresh($this->defaultWith);
    }

    public function forceDeleteUser(int $id): void
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $user->forceDelete();
        Log::info('User permanently deleted', ['user_id' => $id]);
    }

    // ═══════════════════════════════════════════
    // دوال الاستعلام
    // ═══════════════════════════════════════════
    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));
        $companyId = $this->getCurrentCompanyId();

        return User::whereHas('companies', function ($q) use ($companyId) {
            $q->where('companies.id', $companyId);
        })
            ->with($relations)
            ->findOrFail($id);
    }
    public function getByRole(string $roleName)
    {
        return User::role($roleName)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getActive()
    {
        return User::where('active', true)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getInactive()
    {
        return User::where('active', false)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    // ═══════════════════════════════════════════
    // مساعدات
    // ═══════════════════════════════════════════

    private function validateUniqueEmail(string $email, int $companyId, ?int $excludeId = null): void
    {
        $query = User::where('company_id', $companyId)->where('email', $email);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('البريد الإلكتروني مستخدم بالفعل داخل هذه الشركة.', 422);
        }
    }

    private function validateUniqueUsername(string $username, ?int $excludeId = null): void
    {
        $query = User::where('username', $username);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('اسم المستخدم موجود مسبقاً.', 422);
        }
    }

    private function handleAvatarUpload(User $user, $file): void
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreUserRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->getCompanyId();

        return [
            'name'      => 'required|string|max:255',
            'username'  => 'nullable|string|max:50|unique:users,username',
            'email'     => ['required', 'email', 'max:255',
                            Rule::unique('users', 'email')->where('company_id', $companyId)],
            'password'  => 'required|string|min:8|max:100',
            'phone'     => 'nullable|string|max:20',
            'avatar'    => 'nullable|string',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'job_title' => 'nullable|string|max:100',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'national_id'=> 'nullable|string|max:20',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'role'      => 'nullable|string|exists:roles,name',
            'active'    => 'boolean',
        ];
    }

    private function getCompanyId(): int
    {
        return $this->user()?->current_company_id
            ?? app(\App\Services\CompanyContextService::class)->get();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateUserRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId    = $this->route('user');
        $companyId = $this->getCompanyId();

        return [
            'name'      => 'sometimes|string|max:255',
            'username'  => "nullable|string|max:50|unique:users,username,{$userId}",
            'email'     => ['sometimes', 'email', 'max:255',
                            Rule::unique('users', 'email')->ignore($userId)->where('company_id', $companyId)],
            'password'  => 'sometimes|string|min:8|max:100',
            'phone'     => 'nullable|string|max:20',
            'avatar'    => 'nullable|string',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'job_title' => 'nullable|string|max:100',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'national_id'=> 'nullable|string|max:20',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'role'      => 'nullable|string|exists:roles,name',
            'active'    => 'boolean',
        ];
    }

    private function getCompanyId(): int
    {
        return $this->user()?->current_company_id
            ?? app(\App\Services\CompanyContextService::class)->get();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\Warehouserequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['required', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم المستودع مطلوب',
            'name.unique'   => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique'   => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}


class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('warehouse');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['sometimes', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->ignore($id)->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->ignore($id)->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique' => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\UserPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_user');
    }

    public function view(User $user, User $model): bool
    {
        return $user->can('view_user');
    }

    public function create(User $user): bool
    {
        return $user->can('create_user');
    }

    public function update(User $user, User $model): bool
    {
        return $user->can('update_user');
    }

    public function delete(User $user, User $model): bool
    {
        return $user->can('delete_user');
    }

    public function restore(User $user, User $model): bool
    {
        return $user->can('restore_user');
    }

    public function forceDelete(User $user, User $model): bool
    {
        return $user->can('force_delete_user');
    }
}
```

