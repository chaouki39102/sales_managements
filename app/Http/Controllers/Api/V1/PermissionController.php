<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PermissionResource;
use App\Services\PermissionService;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends BaseApiController
{
    protected string $resourceName = 'permission';
    protected ?string $resourceClass = PermissionResource::class;

    public function __construct(private PermissionService $permissionService)
    {
        parent::__construct();
    }

    public function byGroup(Request $request): JsonResponse
    {
        try {
            $group = $request->get('group');
            $permissions = $this->permissionService->getByGroup($group);
            return $this->successResponse(
                PermissionResource::collection($permissions),
                'تم جلب قائمة الأذونات حسب المجموعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    protected function getService(): PermissionService
    {
        return $this->permissionService;
    }

    protected function getModelClass(): string
    {
        return Permission::class;
    }
}