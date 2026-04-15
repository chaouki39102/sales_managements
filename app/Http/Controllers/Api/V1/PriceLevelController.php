<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PriceLevelResource;
use App\Services\PriceLevelService;
use App\Models\PriceLevel;

class PriceLevelController extends BaseApiController
{
    protected string $resourceName = 'price_level';
    protected ?string $resourceClass = PriceLevelResource::class;

    public function __construct(private PriceLevelService $priceLevelService)
    {
        parent::__construct();
    }

    protected function getService(): PriceLevelService
    {
        return $this->priceLevelService;
    }

    protected function getModelClass(): string
    {
        return PriceLevel::class;
    }
}