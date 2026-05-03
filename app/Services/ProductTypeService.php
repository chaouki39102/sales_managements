<?php

namespace App\Services;

use App\Models\ProductType;

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = ProductType::class;
    protected string $resourceName = 'product_type';
    protected function getResourceName(): string { return $this->resourceName; }
}
