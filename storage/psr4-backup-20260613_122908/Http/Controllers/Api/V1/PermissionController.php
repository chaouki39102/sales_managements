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
