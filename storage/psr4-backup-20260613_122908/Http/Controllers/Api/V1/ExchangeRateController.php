<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExchangeRateResource;
use App\Services\ExchangeRateService;
use App\Models\ExchangeRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangeRateController extends BaseApiController
{
    protected string $resourceName = 'exchange_rate';
    protected ?string $resourceClass = ExchangeRateResource::class;

    public function __construct(private ExchangeRateService $exchangeRateService)
    {
        parent::__construct();
    }

    public function latest(Request $request): JsonResponse
    {
        try {
            $rates = $this->exchangeRateService->getLatest();
            return $this->successResponse(
                ExchangeRateResource::collection($rates),
                'تم جلب آخر أسعار الصرف بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'latest');
        }
    }

    protected function getService(): ExchangeRateService
    {
        return $this->exchangeRateService;
    }

    protected function getModelClass(): string
    {
        return ExchangeRate::class;
    }
}