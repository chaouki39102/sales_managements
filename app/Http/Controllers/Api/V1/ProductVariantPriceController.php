<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductVariantPriceResource;
use App\Services\ProductVariantPriceService;
use App\Models\ProductVariantPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantPriceController extends BaseApiController
{
    protected string $resourceName = 'product_variant_price';
    protected ?string $resourceClass = ProductVariantPriceResource::class;

    public function __construct(private ProductVariantPriceService $productVariantPriceService)
    {
        parent::__construct();
    }

    protected function getService(): ProductVariantPriceService
    {
        return $this->productVariantPriceService;
    }

    protected function getModelClass(): string
    {
        return ProductVariantPrice::class;
    }
}