<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Core\Services\ApiListService;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoleController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET    /{company}/roles              → index()
 *   GET    /{company}/roles/{role}       → show($id)
 *   POST   /{company}/roles              → store(Request)
 *   PUT    /{company}/roles/{role}       → update(Request, $id)
 *   DELETE /{company}/roles/{role}       → destroy($id)
 *
 * ✅ متوافق مع BaseApiController:
 *   - extractId() يتعامل مع route params تلقائياً
 *   - resolveRouteId() يبحث عن 'role' ثم 'id' في route params
 *   - getService() و getModelClass() مُعرَّفان
 *   - store() يستخدم StoreRoleRequest (FormRequest)
 *   - update() يستخدم UpdateRoleRequest (FormRequest)
 * ══════════════════════════════════════════════════════════════════
 */

class isn't autoloadable in this context.
    protected ?string $resourceClass = 'App\\Http\\Resources\\RoleResource';

    public function __construct(private readonly RoleService $roleService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/roles
    //
    // ✅ BaseApiController::index() يستدعي getListData() → HasApiList
    // HasApiList يبني query من getListConfig() في RoleService
    // getListConfig() يضع ->distinct() لمنع التكرار
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController — لا نحتاج override

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/roles/{role}
    //
    // ✅ extractId() يستخرج 'role' من route params تلقائياً
    // لا نحتاج override إلا لإضافة RoleResource
    // ──────────────────────────────────────────────────────────────


    public function show($id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $user = $this->userService->findById($resolvedId, ['roles', 'company']);
        $this->authorizeAction('view', $user);

        // ✅ إذا كان مالك الشركة، أضف دوره
        $companyId = app(CompanyContextService::class)->get();
        if ($companyId && $user->company && $user->company->owner_id === $user->id) {
            // مالك الشركة — يمكن إضافة دور owner
            // أو تعديل response
        }

        return $this->successResponse(new UserResource($user));
    } catch (\Throwable $e) {
        return $this->handleError($e, 'show');
    }
}

    // ──────────────────────────────────────────────────────────────
    // store — POST /{company}/roles
    //
    // ✅ يستخدم StoreRoleRequest بدل Request عادي
    // BaseApiController::store() يستدعي getValidatedData() التي
    // تتحقق إذا كان الـ request FormRequest → تستدعي validated()
    // ──────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);
            $validatedData = $request instanceof StoreRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->create($validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم إنشاء الدور بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // update — PUT /{company}/roles/{role}
    //
    // ✅ يستخدم UpdateRoleRequest
    // extractId() يحل {role} من route params
    // ──────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('update', $role);
            $validatedData = $request instanceof UpdateRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->update($role, $validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم تحديث الدور بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // destroy — DELETE /{company}/roles/{role}
    // ──────────────────────────────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('delete', $role);

            // ✅ لا نسمح بحذف الأدوار الأساسية
            if (in_array($role->name, ['owner', 'admin', 'super-admin'], true)) {
                return $this->errorResponse(
                    'لا يمكن حذف الأدوار الأساسية للنظام',
                    409,
                    'BUSINESS_RULE_VIOLATION'
                );
            }

            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ──────────────────────────────────────────────────────────────
    // ✅ resolveRouteId — يبحث عن 'role' في route params
    // ──────────────────────────────────────────────────────────────

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('role', 'id');
    }
}
