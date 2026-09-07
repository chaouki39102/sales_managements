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
                ->when($companyId, fn($q) => $q->where('roles.company_id', $companyId))
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
