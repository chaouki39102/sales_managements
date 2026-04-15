<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\StockMovementTypeResource;
use App\Services\StockMovementTypeService;
use App\Models\StockMovementType;

class StockMovementTypeController extends BaseApiController
{
    protected string $resourceName = 'stock_movement_type';
    protected ?string $resourceClass = StockMovementTypeResource::class;

    public function __construct(private StockMovementTypeService $stockMovementTypeService)
    {
        parent::__construct();
    }

    protected function getService(): StockMovementTypeService
    {
        return $this->stockMovementTypeService;
    }

    protected function getModelClass(): string
    {
        return StockMovementType::class;
    }
}