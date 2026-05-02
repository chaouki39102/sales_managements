<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreProductVariantRequest;
use App\Http\Requests\UpdateProductVariantRequest;
use App\Http\Resources\ProductVariantResource;
use App\Models\ProductVariant;
use App\Services\ProductVariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantController extends BaseApiController
{
    protected string $resourceName = 'product_variant';
    protected ?string $resourceClass = ProductVariantResource::class;

    public function __construct(private ProductVariantService $service)
    {
        parent::__construct();
    }

    protected function getService(): ProductVariantService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductVariant::class;
    }

    protected function getListConfig(): array
    {
        return [
            'search_fields' => ProductVariant::$searchableFields,
            'filters' => ProductVariant::$filterable,
            'sorts' => ProductVariant::$sortable,
            'relations' => ProductVariant::$allowedIncludes,
            'default_includes' => ProductVariant::$defaultWith,
            'default_sort' => ProductVariant::$defaultSort,
            'default_per_page' => ProductVariant::$defaultPerPage,
            'per_page_limit' => ProductVariant::$perPageLimit,
            'cache_ttl' => ProductVariant::$cacheTtl,
            'cache_tags' => ProductVariant::$cacheTags,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', ProductVariant::class);
            $data = $this->getListData($request);
            return $this->successResponse($data, 'تم جلب قائمة المتغيرات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('view', $variant);
            return $this->successResponse(new ProductVariantResource($variant->load('product', 'barcodes')));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(StoreProductVariantRequest $request): JsonResponse
    {
        try {
            $variant = $this->service->create($request->validated(), $request);
            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم إنشاء المتغير بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(UpdateProductVariantRequest $request, $id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('update', $variant);
            $variant = $this->service->update($variant, $request->validated(), $request);
            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم تحديث المتغير'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('delete', $variant);
            $this->service->delete($variant);
            return $this->successResponse(null, 'تم حذف المتغير');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // إضافي: جلب متغيرات منتج معين
    public function indexByProduct(Request $request, $productId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', ProductVariant::class);
            $data = $this->apiListWithCallback(
                ProductVariant::class,
                fn($query) => $query->where('product_id', $productId),
                $request,
                $this->getListConfig()
            );
            return $this->successResponse($data, 'تم جلب متغيرات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }
}
