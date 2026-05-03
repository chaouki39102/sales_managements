<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends BaseApiController
{
    protected string $resourceName = 'role';
    protected ?string $resourceClass = RoleResource::class;

    public function __construct(private RoleService $roleService)
    {
        parent::__construct();
    }

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ══════════════════════════════════════════
    // نفس مشكلة UserController: /{company}/{role}
    // Laravel يمرر {company} كـ $id بدل {role}
    // الحل: قراءة {role} من الـ route بالاسم
    // ══════════════════════════════════════════

    public function show($id): JsonResponse
    {
        try {
            $roleId = request()->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('view', $role);
            return $this->successResponse(new RoleResource($role));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);

            $data = $request->validate([
                'name'             => 'required|string|max:100|unique:roles,name',
                'display_name'     => 'nullable|string|max:150',
                'description'      => 'nullable|string|max:500',
                'guard_name'       => 'nullable|string|max:50',
                'permission_ids'   => 'nullable|array',
                'permission_ids.*' => 'integer|exists:permissions,id',
            ]);

            $role = $this->roleService->create($data);
            return $this->successResponse(new RoleResource($role), 'تم إنشاء الدور بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            // الإصلاح: نقرأ {role} بالاسم بدل الاعتماد على الترتيب
            $roleId = $request->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('update', $role);

            $data = $request->validate([
                'display_name'     => 'nullable|string|max:150',
                'description'      => 'nullable|string|max:500',
                'permission_ids'   => 'nullable|array',
                'permission_ids.*' => 'integer|exists:permissions,id',
            ]);

            $role = $this->roleService->update($role, $data);
            return $this->successResponse(new RoleResource($role), 'تم تحديث الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            // الإصلاح: request() helper بدل $request parameter
            $roleId = request()->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('delete', $role);
            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }
}
