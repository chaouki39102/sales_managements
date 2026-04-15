<?php

namespace App\Services;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class ExchangeRateService extends \App\Core\Services\BaseService
{
    protected string $model = ExchangeRate::class;
    protected string $resourceName = 'exchange_rate';
    protected array $defaultWith = ['fromCurrency', 'toCurrency'];

    public function getLatest()
    {
        return $this->model::latest()->get();
    }
}