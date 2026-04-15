<?php

namespace App\Services;

use App\Models\InventoryValuationMethod;

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
}
