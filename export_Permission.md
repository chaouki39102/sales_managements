# Module Export: Permission
Generated at: 2026-05-31 12:43:37

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Permission.php
```php
<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;
use App\Core\Traits\HasStandardizedConfiguration;

class Permission extends SpatiePermission
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'company_id',
        'name',
        'guard_name',
        'display_name',
        'group',
        'description',
    ];

    public static array $searchableFields = ['name', 'display_name', 'description'];
    public static array $filterable = ['guard_name', 'group', 'company_id'];
    public static array $sortable = ['id', 'name', 'display_name', 'group'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['roles'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['permissions'];

    public function scopeByGroup($query, string $group)
    {
        return $query->where('group', $group);
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\PermissionController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PermissionResource;
use App\Services\PermissionService;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PermissionController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET /{company}/permissions                → index()
 *   GET /{company}/permissions/by-group       → byGroup()
 *   GET /{company}/permissions/{permission}   → show($id)
 *
 * القراءة فقط — لا create/update/delete من هنا
 * (الصلاحيات تُنشأ من AdminSystemBootController أو Seeder)
 * ══════════════════════════════════════════════════════════════════
 */
class PermissionController extends BaseApiController
{
    protected string  $resourceName  = 'permission';
    protected ?string $resourceClass = PermissionResource::class;

    public function __construct(private readonly PermissionService $permissionService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/permissions
    // يرث من BaseApiController — HasApiList يبني الـ query
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController

    // ──────────────────────────────────────────────────────────────
    // byGroup — GET /{company}/permissions/by-group?group=xxx
    //
    // ✅ يُرجع:
    //   - بدون ?group : {"group_name": [permissions...], ...}
    //   - مع ?group=xxx: [permissions...]
    // ──────────────────────────────────────────────────────────────

    public function byGroup(Request $request): JsonResponse
    {
        try {
            $group = $request->query('group');
            $data  = $this->permissionService->getByGroup($group);

            if ($group) {
                // مجموعة محددة → collection مسطّحة
                return $this->successResponse(
                    PermissionResource::collection($data),
                    "تم جلب صلاحيات المجموعة: {$group}"
                );
            }

            // كل المجموعات → grouped dict
            // ✅ نُحوّل كل collection في المجموعة إلى PermissionResource
            $grouped = $data->map(
                fn($perms) => PermissionResource::collection($perms)->toArray($request)
            )->toArray();

            return $this->successResponse(
                $grouped,
                'تم جلب الصلاحيات مجمّعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/permissions/{permission}
    // ──────────────────────────────────────────────────────────────

    public function show($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $permission = $this->permissionService->findById($resolvedId);
            $this->authorizeAction('view', $permission);
            return $this->successResponse(new PermissionResource($permission));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): PermissionService
    {
        return $this->permissionService;
    }

    protected function getModelClass(): string
    {
        return Permission::class;
    }

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('permission', 'id');
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\UserPermissionsMethods.php
```php
<?php
// ════════════════════════════════════════════════════════════════════════════
// أضف هذين الـ methods لـ UserController الموجود
// (أو أنشئ ملفاً منفصلاً إذا كان UserController كبيراً)
// ════════════════════════════════════════════════════════════════════════════

// في api.php، أضف هذين الـ routes داخل tenant group (⑤):
//
//   Route::get('me/permissions', [UserController::class, 'myPermissions']);
//   Route::get('me/roles',       [UserController::class, 'myRoles']);

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\RoleResource;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Methods to add to UserController
 *
 * GET /{company}/me/permissions → string[] أسماء الصلاحيات
 * GET /{company}/me/roles       → { roles: Role[], permissions: string[] }
 */
trait HasUserPermissionEndpoints
{
    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/permissions
    //
    // ✅ يُرجع قائمة أسماء الصلاحيات للمستخدم الحالي
    // (من دوره داخل الشركة الحالية)
    // ──────────────────────────────────────────────────────────────

    public function myPermissions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // جلب الصلاحيات من خلال Spatie
            // ✅ getAllPermissions() تجمع صلاحيات كل الأدوار + المباشرة
            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse($permissions, 'صلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myPermissions');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/roles
    //
    // ✅ يُرجع أدوار المستخدم + صلاحياته معاً
    // ──────────────────────────────────────────────────────────────

    public function myRoles(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // ✅ جلب أدوار الشركة الحالية فقط
            $companyId = app(\App\Services\CompanyContextService::class)->get();

            $roles = $user->roles()
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with('permissions')
                ->get();

            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse([
                'roles'       => RoleResource::collection($roles),
                'permissions' => $permissions,
            ], 'أدوار وصلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myRoles');
        }
    }
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\PermissionService.php
```php
<?php

namespace App\Services;

use App\Models\Permission;
use App\Core\Services\BaseService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class PermissionService extends BaseService
{
    protected string $model        = Permission::class;
    protected string $resourceName = 'permission';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'permission';
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ الإصلاح الجذري للصلاحيات الفارغة:
    //
    // المشكلة: الصلاحيات مخزنة بـ company_id = NULL (عالمية).
    // BaseService::applyScopeToQuery() يُضيف WHERE company_id = X
    // فتُرجع total: 0 لأنه لا توجد صلاحيات بـ company_id محدد.
    //
    // الحل: تجاوز الـ scope بـ modifyQuery يُلغي أي company_id filter
    // ويطلب الصلاحيات العالمية (company_id IS NULL) فقط.
    //
    // هذا صحيح معمارياً:
    //   - الصلاحيات GLOBAL دائماً → company_id = null
    //   - الأدوار TENANT → company_id = شركة
    //   - كل شركة تربط أدوارها بنفس مجموعة الصلاحيات العالمية
    // ══════════════════════════════════════════════════════════════

    protected function getListConfig(): array
    {
        return [
            'searchable'     => Permission::$searchableFields,
            'filterable'     => Permission::$filterable,
            'sortable'       => Permission::$sortable,
            'defaultSort'    => Permission::$defaultSort,
            'defaultWith'    => [],
            'allowedIncludes'=> Permission::$allowedIncludes,
            'cache_tags'     => ['permissions'],
            'modifyQuery'    => function ($query) {
                // ✅ الصلاحيات عالمية دائماً (company_id IS NULL)
                // نُعيد تعريف الـ scope يدوياً بدل ما يطبقه BaseService خطأً
                $query->whereNull('company_id');
            },
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ getByGroup — تجميع الصلاحيات حسب المجموعة
    //
    // يُرجع: Collection<string, Collection<Permission>>
    // المفتاح = اسم المجموعة, القيمة = صلاحيات المجموعة
    // ══════════════════════════════════════════════════════════════

    public function getByGroup(?string $group = null): Collection|array
    {
        $query = $this->model::query()
            ->whereNull('company_id')   // ✅ عالمية فقط
            ->orderBy('group')
            ->orderBy('name');

        if ($group) {
            $query->where('group', $group);
            return $query->get();
        }

        // بدون group → نُرجع مجمَّعة
        return $query->get()->groupBy('group');
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ getGrouped — للفرونت إند (grouped array جاهز للعرض)
    // ══════════════════════════════════════════════════════════════

    public function getGrouped(): array
    {
        $grouped = $this->getByGroup();

        if ($grouped instanceof Collection) {
            return $grouped
                ->map(fn($perms) => $perms->values())
                ->toArray();
        }

        return [];
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\PermissionRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:permissions,name',
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'group' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
        ];
    }
}

class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255|unique:permissions,name,' . $this->route('permission'),
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'group' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
        ];
    }
}
```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\PermissionPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PermissionPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_permission');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_permission');
    }

    public function create(User $user): bool
    {
        return $user->can('create_permission');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_permission');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_permission');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_permission');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_permission');
    }
}
```

