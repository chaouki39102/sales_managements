<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\UnitResource;
use App\Services\UnitService;
use App\Models\Unit;

class UnitController extends BaseApiController
{
    protected string $resourceName = 'unit';
    protected ?string $resourceClass = UnitResource::class;

    public function __construct(private UnitService $unitService)
    {
        parent::__construct();
    }

    protected function getService(): UnitService
    {
        return $this->unitService;
    }

    protected function getModelClass(): string
    {
        return Unit::class;
    }
}