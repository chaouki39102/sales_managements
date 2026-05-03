<?php

namespace App\Services;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class ExchangeRateService extends \App\Core\Services\BaseService
{
    protected string $model = ExchangeRate::class;
    protected string $resourceName = 'exchange_rate';
    protected array $defaultWith = ['fromCurrency', 'toCurrency'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getLatest()
    {
        return $this->model::latest()->get();
    }
}
