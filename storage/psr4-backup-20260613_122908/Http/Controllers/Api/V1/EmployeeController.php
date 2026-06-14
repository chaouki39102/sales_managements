<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\EmployeeResource;
use App\Services\EmployeeService;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends BaseApiController
{
    protected string $resourceName = 'employee';
    protected ?string $resourceClass = EmployeeResource::class;

    public function __construct(private EmployeeService $employeeService)
    {
        parent::__construct();
    }

    public function active(Request $request): JsonResponse
    {
        try {
            $employees = $this->employeeService->getActiveEmployees();
            return $this->successResponse(
                EmployeeResource::collection($employees),
                'تم جلب قائمة الموظفين النشطين بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): EmployeeService
    {
        return $this->employeeService;
    }

    protected function getModelClass(): string
    {
        return Employee::class;
    }
}