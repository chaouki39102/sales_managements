<?php

namespace App\Services;

use App\Models\PriceLevel;

class PriceLevelService extends \App\Core\Services\BaseService
{
    protected string $model = PriceLevel::class;
    protected string $resourceName = 'priceLevel';
    protected function getResourceName(): string { return $this->resourceName; }
}
