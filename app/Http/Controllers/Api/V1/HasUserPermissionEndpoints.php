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
use App\Models\User;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Collection;
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

            $permissions = $this->currentCompanyPermissionNames($user);

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

            // أدوار الشركة الحالية + الأدوار العامة (NULL)
            $companyId = app(CompanyContextService::class)->get();

            $roles = $this->currentCompanyRoles($user, $companyId);

            $permissions = $this->currentCompanyPermissionNames($user);

            return $this->successResponse([
                'roles'       => RoleResource::collection($roles),
                'permissions' => $permissions,
            ], 'أدوار وصلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myRoles');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // أدوات مساعدة: الصلاحيات الفعالة ضمن نطاق الشركة الحالية
    // ──────────────────────────────────────────────────────────────

    protected function currentCompanyPermissionNames(User $user): array
    {
        $companyId = app(CompanyContextService::class)->get();

        // المالك / السوبر أدم يملكان كل شيء ضمناً (Gate::before) —
        // نرجع لهما كل أسماء الصلاحيات لتبقى واجهة الأزرار مكتملة.
        if ($this->hasImplicitFullControl($user, $companyId)) {
            $permissionClass = app(\Spatie\Permission\PermissionRegistrar::class)->getPermissionClass();

            return $permissionClass::query()
                ->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id');
                    if ($companyId) {
                        $q->orWhere('company_id', $companyId);
                    }
                })
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();
        }

        $rolePermissions = $this->currentCompanyRoles($user, $companyId)
            ->flatMap(fn($role) => $role->permissions)
            ->pluck('name');

        // الصلاحيات المباشرة — ضمن نطاق الشركة الحالية أو عامة فقط.
        // استعلام طازج (permissions()->get()) لا قراءة العلاقة المخزنة مؤقتاً:
        // `getDirectPermissions()` ترجع $this->permissions (العلاقة المخزنة
        // على النسخة) — لو كانت النسخة مشتركة (Sanctum::actingAs في الاختبارات)
        // تبقى الحقن القديمة مرئية بعد أي تعديل، فيجب دائماً إعادة الاستعلام.
        $directPermissions = $user->permissions()
            ->get()
            ->filter(fn($p) => $p->company_id === null || (int) $p->company_id === (int) $companyId)
            ->pluck('name');

        return $rolePermissions
            ->merge($directPermissions)
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * أدوار المستخدم ضمن نطاق الشركة الحالية:
     * roles.company_id = $companyId (أدوار الشركة) أو NULL (أدوار عامة).
     * عندما لا توجد شركة حالية → الأدوار العامة فقط.
     */
    protected function currentCompanyRoles(User $user, ?int $companyId): Collection
    {
        return $user->roles()
            ->where(function ($q) use ($companyId) {
                if ($companyId) {
                    $q->where('roles.company_id', $companyId);
                }
                $q->orWhereNull('roles.company_id');
            })
            ->with('permissions')
            ->get();
    }

    /**
     * سيطرة ضمنية كاملة داخل الشركة الحالية (يطابق مبدأ Gate::before).
     */
    protected function hasImplicitFullControl(User $user, ?int $companyId): bool
    {
        if ($user->hasRole('super-admin')) {
            return true;
        }

        return $companyId && \App\Models\Company::where('id', $companyId)
            ->where('owner_id', $user->id)
            ->exists();
    }
}
