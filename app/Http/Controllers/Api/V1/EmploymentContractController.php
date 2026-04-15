<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\EmploymentContractResource;
use App\Services\EmploymentContractService;
use App\Models\EmploymentContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmploymentContractController extends BaseApiController
{
    protected string $resourceName = 'employment_contract';
    protected ?string $resourceClass = EmploymentContractResource::class;

    public function __construct(private EmploymentContractService $employmentContractService)
    {
        parent::__construct();
    }

    public function active(Request $request, int $employeeId): JsonResponse
    {
        try {
            $contract = $this->employmentContractService->getActiveContract($employeeId);
            return $this->successResponse(
                $contract ? new EmploymentContractResource($contract) : null,
                'تم جلب العقد النشط بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): EmploymentContractService
    {
        return $this->employmentContractService;
    }

    protected function getModelClass(): string
    {
        return EmploymentContract::class;
    }
}