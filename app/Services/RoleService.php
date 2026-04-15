<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RoleService extends \App\Core\Services\BaseService
{
    protected string $model = Role::class;
    protected string $resourceName = 'role';
    protected array $defaultWith = ['permissions'];
}