<?php

namespace App\Services;

use App\Models\ProductVariant;

class ProductVariantService extends \App\Core\Services\BaseService
{
    protected string $model = ProductVariant::class;
    protected string $resourceName = 'product_variant';
    protected array $defaultWith = ['product', 'prices'];
}
