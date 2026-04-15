<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeService extends \App\Core\Services\BaseService
{
    protected string $model = Employee::class;
    protected string $resourceName = 'employee';
    protected array $defaultWith = ['user', 'gender', 'contracts'];

    public function getActiveEmployees()
    {
        return $this->model::active()->get();
    }
}