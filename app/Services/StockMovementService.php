<?php

namespace App\Services;

use App\Models\StockMovement;

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
}
