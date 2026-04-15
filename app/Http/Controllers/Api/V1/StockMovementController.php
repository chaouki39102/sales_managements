<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\StockMovementResource;
use App\Services\StockMovementService;
use App\Models\StockMovement;

class StockMovementController extends BaseApiController
{
    protected string $resourceName = 'stock_movement';
    protected ?string $resourceClass = StockMovementResource::class;

    public function __construct(private StockMovementService $stockMovementService)
    {
        parent::__construct();
    }

    protected function getService(): StockMovementService
    {
        return $this->stockMovementService;
    }

    protected function getModelClass(): string
    {
        return StockMovement::class;
    }

    public function incoming()
    {
        return $this->getService()->getIncoming();
    }

    public function outgoing()
    {
        return $this->getService()->getOutgoing();
    }
}
