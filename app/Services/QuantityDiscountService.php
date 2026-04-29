<?php

namespace App\Services;

use App\Models\QuantityDiscount;
use Illuminate\Http\Request;

class QuantityDiscountService extends \App\Core\Services\BaseService
{
    protected string $model = QuantityDiscount::class;
    protected string $resourceName = 'quantity_discount';
    protected array $defaultWith = ['product', 'priceLevel'];
    
}
