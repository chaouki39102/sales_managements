<?php

namespace App\Services;

use App\Models\ProductLot;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
}
