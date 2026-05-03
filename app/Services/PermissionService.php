<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PermissionService extends \App\Core\Services\BaseService
{
    protected string $model = Permission::class;
    protected string $resourceName = 'permission';
    protected array $defaultWith = ['roles'];

       protected function getResourceName(): string
    {
        return 'permission';
    }



    public function getByGroup(?string $group = null)
    {
        if ($group) {
            return $this->model::byGroup($group)->get();
        }
        return $this->model::all();
    }
}
