<?php

namespace App\Services;

use App\Models\Payment;

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected function getResourceName(): string { return $this->resourceName; }
}
