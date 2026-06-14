<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductTypeResource;
use App\Services\ProductTypeService;
use App\Models\ProductType;

class ProductTypeController extends BaseApiController
{
    protected string $resourceName = 'product_type';
    protected ?string $resourceClass = ProductTypeResource::class;

    public function __construct(private ProductTypeService $productTypeService)
    {
        parent::__construct();
    }

    protected function getService(): ProductTypeService
    {
        return $this->productTypeService;
    }

    protected function getModelClass(): string
    {
        return ProductType::class;
    }
}