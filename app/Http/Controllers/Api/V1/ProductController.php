<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Product Controller
 *
 * إدارة المنتجات مع:
 * - CRUD كامل
 * - تصفية حسب العائلة والعلامة التجارية
 * - البحث والترتيب
 * - التحقق من الصلاحيات
 *
 * @package App\Http\Controllers\Api\V1
 */
class ProductController extends BaseApiController
{
    protected string $resourceName = 'product';
    protected ?string $resourceClass = ProductResource::class;

    public function __construct(private ProductService $productService)
    {
        parent::__construct();
    }

    /**
     * Get active products
     */
    public function active(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $products = $this->productService->getActiveProducts();

            return $this->successResponse(
                ProductResource::collection($products),
                'تم جلب قائمة المنتجات النشطة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    /**
     * Get products by family
     */
    public function byFamily(Request $request, int $familyId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $products = $this->productService->getByFamily($familyId);

            return $this->successResponse(
                ProductResource::collection($products),
                'تم جلب قائمة المنتجات حسب العائلة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byFamily');
        }
    }

    /**
     * Get products by brand
     */
    public function byBrand(Request $request, int $brandId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $products = $this->productService->getByBrand($brandId);

            return $this->successResponse(
                ProductResource::collection($products),
                'تم جلب قائمة المنتجات حسب العلامة التجارية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byBrand');
        }
    }

    /**
     * Get products with variants
     */
    public function withVariants(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $products = $this->productService->getWithVariants();

            return $this->successResponse(
                ProductResource::collection($products),
                'تم جلب قائمة المنتجات ذات المتغيرات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'withVariants');
        }
    }

    protected function getService(): ProductService
    {
        return $this->productService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}
