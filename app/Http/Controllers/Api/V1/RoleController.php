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
}