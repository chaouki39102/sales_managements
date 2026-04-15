<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductVariantResource;
use App\Services\ProductVariantService;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductVariantController extends BaseApiController
{
    protected string $resourceName = 'product_variant';
    protected ?string $resourceClass = ProductVariantResource::class;

    public function __construct(private ProductVariantService $service)
    {
        parent::__construct();
    }

    public function lowStock(Request $request): JsonResponse
    {
        try {
            $variants = $this->service->getLowStock();
            return $this->successResponse(ProductVariantResource::collection($variants), 'تم جلب المنتجات ذات المخزون المنخفض بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lowStock');
        }
    }

    protected function getService(): ProductVariantService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductVariant::class;
    }
}