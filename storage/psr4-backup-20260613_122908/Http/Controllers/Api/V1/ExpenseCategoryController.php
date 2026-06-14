<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseCategoryResource;
use App\Services\ExpenseCategoryService;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends BaseApiController
{
    protected string $resourceName = 'expense_category';
    protected ?string $resourceClass = ExpenseCategoryResource::class;

    public function __construct(private ExpenseCategoryService $expenseCategoryService)
    {
        parent::__construct();
    }

    public function roots(Request $request): JsonResponse
    {
        try {
            $categories = $this->expenseCategoryService->getRoots();
            return $this->successResponse(
                ExpenseCategoryResource::collection($categories),
                'تم جلب الفئات الرئيسية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'roots');
        }
    }

    protected function getService(): ExpenseCategoryService
    {
        return $this->expenseCategoryService;
    }

    protected function getModelClass(): string
    {
        return ExpenseCategory::class;
    }
}