<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NumberingSeriesResource;
use App\Services\NumberingSeriesService;
use App\Models\NumberingSeries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NumberingSeriesController extends BaseApiController
{
    protected string $resourceName = 'numbering_series';
    protected ?string $resourceClass = NumberingSeriesResource::class;

    public function __construct(private NumberingSeriesService $numberingSeriesService)
    {
        parent::__construct();
    }

    public function getNextNumber(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $nextNumber = $series->getNextNumber();
            $series->incrementNumber();
            
            return $this->successResponse([
                'series_id' => $series->id,
                'next_number' => $nextNumber,
            ], 'تم جلب الرقم التالي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'getNextNumber');
        }
    }

    public function unlock(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $series = $this->numberingSeriesService->unlock($series);
            
            return $this->successResponse(
                $this->transformItem($series),
                'تم فتح القفل بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    public function lock(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $series = $this->numberingSeriesService->lock($series);
            
            return $this->successResponse(
                $this->transformItem($series),
                'تم القفل بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    protected function getService(): NumberingSeriesService
    {
        return $this->numberingSeriesService;
    }

    protected function getModelClass(): string
    {
        return NumberingSeries::class;
    }
}