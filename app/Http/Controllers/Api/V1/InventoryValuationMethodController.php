<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\InventoryValuationMethodResource;
use App\Services\InventoryValuationMethodService;
use App\Models\InventoryValuationMethod;

class InventoryValuationMethodController extends BaseApiController
{
    protected string $resourceName = 'inventory_valuation_method';
    protected ?string $resourceClass = InventoryValuationMethodResource::class;

    public function __construct(private InventoryValuationMethodService $inventoryValuationMethodService)
    {
        parent::__construct();
    }

    protected function getService(): InventoryValuationMethodService
    {
        return $this->inventoryValuationMethodService;
    }

    protected function getModelClass(): string
    {
        return InventoryValuationMethod::class;
    }
}
