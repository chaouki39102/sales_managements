<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseResource;
use App\Services\ExpenseService;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExpenseController extends BaseApiController
{
    protected string $resourceName = 'expense';
    protected ?string $resourceClass = ExpenseResource::class;

    public function __construct(private ExpenseService $service)
    {
        parent::__construct();
    }

    public function paid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getPaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'paid');
        }
    }

    public function unpaid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getUnpaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات غير المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unpaid');
        }
    }

    protected function getService(): ExpenseService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return Expense::class;
    }
}