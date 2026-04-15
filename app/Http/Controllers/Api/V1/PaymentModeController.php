<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentModeResource;
use App\Services\PaymentModeService;
use App\Models\PaymentMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentModeController extends BaseApiController
{
    protected string $resourceName = 'payment_mode';
    protected ?string $resourceClass = PaymentModeResource::class;

    public function __construct(private PaymentModeService $paymentModeService)
    {
        parent::__construct();
    }

    public function active(Request $request): JsonResponse
    {
        try {
            $modes = $this->paymentModeService->getActive();
            return $this->successResponse(
                PaymentModeResource::collection($modes),
                'تم جلب أوضاع الدفع النشطة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): PaymentModeService
    {
        return $this->paymentModeService;
    }

    protected function getModelClass(): string
    {
        return PaymentMode::class;
    }
}