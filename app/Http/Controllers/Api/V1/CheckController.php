<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CheckResource;
use App\Services\CheckService;
use App\Models\Check;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckController extends BaseApiController
{
    protected string $resourceName = 'check';
    protected ?string $resourceClass = CheckResource::class;

    public function __construct(private CheckService $checkService)
    {
        parent::__construct();
    }

    public function pending(Request $request): JsonResponse
    {
        try {
            $checks = $this->checkService->getPending();
            return $this->successResponse(
                CheckResource::collection($checks),
                'تم جلب الشيكات المعلقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'pending');
        }
    }

    public function overdue(Request $request): JsonResponse
    {
        try {
            $checks = $this->checkService->getOverdue();
            return $this->successResponse(
                CheckResource::collection($checks),
                'تم جلب الشيكات المتأخرة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'overdue');
        }
    }

    public function markAsCleared(Request $request, int $id): JsonResponse
    {
        try {
            $check = $this->checkService->findById($id);
            $check = $this->checkService->markAsCleared($check);
            return $this->successResponse(
                new CheckResource($check),
                'تم تصفيه الشيك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsCleared');
        }
    }

    public function markAsBounced(Request $request, int $id): JsonResponse
    {
        try {
            $reason = $request->get('reason', 'Reason not provided');
            $check = $this->checkService->findById($id);
            $check = $this->checkService->markAsBounced($check, $reason);
            return $this->successResponse(
                new CheckResource($check),
                'تم رفض الشيك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsBounced');
        }
    }

    protected function getService(): CheckService
    {
        return $this->checkService;
    }

    protected function getModelClass(): string
    {
        return Check::class;
    }
}