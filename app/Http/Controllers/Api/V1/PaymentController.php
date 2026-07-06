<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentResource;
use App\Services\PaymentService;
use App\Models\Payment;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use Illuminate\Http\Request;

class PaymentController extends BaseApiController
{
    protected string $resourceName = 'payment';
    protected ?string $resourceClass = PaymentResource::class;

    public function __construct(private PaymentService $paymentService)
    {
        parent::__construct();
    }

    protected function getService(): PaymentService
    {
        return $this->paymentService;
    }

    protected function getModelClass(): string
    {
        return Payment::class;
    }

    protected function getValidatedData(Request $request, $id = null): array
    {
        $rules = $id ? (new UpdatePaymentRequest())->rules() : (new StorePaymentRequest())->rules();
        return $request->validate($rules);
    }

    public function confirmed()
    {
        return $this->getService()->getConfirmed();
    }

    public function pending()
    {
        return $this->getService()->getPending();
    }
}
