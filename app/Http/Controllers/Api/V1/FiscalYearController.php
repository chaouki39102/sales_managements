<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalYearResource;
use App\Services\FiscalYearService;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FiscalYearController extends BaseApiController
{
    protected string $resourceName = 'fiscal_year';
    protected ?string $resourceClass = FiscalYearResource::class;

    public function __construct(private FiscalYearService $service)
    {
        parent::__construct();
    }

    public function current(Request $request): JsonResponse
    {
        try {
            $year = $this->service->getCurrent();
            return $this->successResponse($year ? new FiscalYearResource($year) : null, 'تم جلب السنة المالية الحالية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    public function open(Request $request): JsonResponse
    {
        try {
            $years = $this->service->getOpen();
            return $this->successResponse(FiscalYearResource::collection($years), 'تم جلب السنوات المالية المفتوحة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'open');
        }
    }

    public function close(Request $request, int $id): JsonResponse
    {
        try {
            $year = $this->service->findById($id);
            $notes = $request->get('notes');
            $year = $this->service->close($year, auth()->id(), $notes);
            return $this->successResponse(new FiscalYearResource($year), 'تم غلق السنة المالية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'close');
        }
    }

    protected function getService(): FiscalYearService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return FiscalYear::class;
    }
}