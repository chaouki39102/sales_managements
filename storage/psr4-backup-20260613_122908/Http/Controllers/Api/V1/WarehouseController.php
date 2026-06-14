<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\WarehouseResource;
use App\Services\WarehouseService;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;

/**
 * Warehouse Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class WarehouseController extends BaseApiController
{
    protected string $resourceName = 'warehouse';
    protected ?string $resourceClass = WarehouseResource::class;

    public function __construct(private WarehouseService $warehouseService)
    {
        parent::__construct();
    }

    protected function getService(): WarehouseService
    {
        return $this->warehouseService;
    }

    protected function getModelClass(): string
    {
        return Warehouse::class;
    }
}
