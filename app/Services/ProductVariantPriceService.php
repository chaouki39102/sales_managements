<?php

namespace App\Services;

use App\Models\ProductVariantPrice;
use Illuminate\Http\Request;

class ProductVariantPriceService extends \App\Core\Services\BaseService
{
    protected string $model = ProductVariantPrice::class;
    protected string $resourceName = 'product_variant_price';
    protected array $defaultWith = ['productVariant', 'priceLevel'];
}