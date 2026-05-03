<?php

namespace App\Services;

use App\Models\EmploymentContract;
use Illuminate\Http\Request;

class EmploymentContractService extends \App\Core\Services\BaseService
{
    protected string $model = EmploymentContract::class;
    protected string $resourceName = 'employment_contract';
    protected array $defaultWith = ['employee'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getActiveContract(int $employeeId)
    {
        return $this->model::where('employee_id', $employeeId)->active()->first();
    }
}
