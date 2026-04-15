<?php

namespace App\Services;

use App\Models\PaymentMode;
use Illuminate\Http\Request;

class PaymentModeService extends \App\Core\Services\BaseService
{
    protected string $model = PaymentMode::class;
    protected string $resourceName = 'payment_mode';
    protected array $defaultWith = ['treasuryAccount'];

    public function getActive()
    {
        return $this->model::where('active', true)->get();
    }
}