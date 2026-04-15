<?php

namespace App\Services;

use App\Models\StockMovementType;

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
}
