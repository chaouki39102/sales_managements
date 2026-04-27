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
 * Product Controller — البوّاب
 *
 * مسؤوليته الوحيدة: استقبال الطلب، التحقق من الصلاحيات،
 * تفويض المنطق للـ ProductService، وإرجاع الرد.
 */
class ProductController extends BaseApiController
{
    protected string $resourceName = 'product';
    protected ?string $resourceClass = ProductResource::class;

    public function __construct(private ProductService $productService)
    {
        parent::__construct();
    }

    // =========================================================
    // CRUD مع دعم المتغيرات
    // =========================================================

    /**
     * إنشاء منتج جديد مع متغيراته
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Product::class);

            // التحقق عبر StoreProductRequest
            $validated = app(StoreProductRequest::class)->validated();
            // نضيف variants من الطلب الأصلي (لأنها غير موجودة في FormRequest)
            $validated['variants'] = $request->input('variants', []);

            $item = $this->productService->create($validated, $request);

            // جلب المنتج مع علاقاته كاملة للرد
            $item = $this->productService->findById($item->id);

            return $this->successResponse(
                new ProductResource($item),
                'تم إنشاء المنتج بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    /**
     * عرض منتج مع كل متغيراته وأسعاره
     */
    public function show($id): JsonResponse
    {
        try {
            $item = $this->productService->findById($id);
            $this->authorizeAction('view', $item);

            return $this->successResponse(new ProductResource($item));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    /**
     * تحديث منتج مع مزامنة متغيراته
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $item = $this->productService->findById($id);
            $this->authorizeAction('update', $item);

            // التحقق عبر UpdateProductRequest
            $validated = app(UpdateProductRequest::class)->validated();
            // نضيف variants من الطلب الأصلي
            if ($request->has('variants')) {
                $validated['variants'] = $request->input('variants');
            }

            $item = $this->productService->update($item, $validated, $request);

            // إعادة جلب مع العلاقات
            $item = $this->productService->findById($item->id);

            return $this->successResponse(
                new ProductResource($item),
                'تم تحديث المنتج بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    /**
     * حذف منتج (soft delete)
     */
    public function destroy($id): JsonResponse
    {
        try {
            $item = $this->productService->findById($id);
            $this->authorizeAction('delete', $item);
            $this->productService->delete($item);

            return $this->successResponse(null, 'تم حذف المنتج بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // =========================================================
    // Custom Actions
    // =========================================================

    public function active(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getActiveProducts();
            return $this->successResponse(ProductResource::collection($products), 'تم جلب المنتجات النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    public function byFamily(Request $request, int $familyId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByFamily($familyId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byFamily');
        }
    }

    public function byBrand(Request $request, int $brandId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByBrand($brandId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byBrand');
        }
    }

    public function withVariants(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getWithVariants();
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'withVariants');
        }
    }

    // =========================================================
    // Required by BaseApiController
    // =========================================================

    protected function getService(): ProductService
    {
        return $this->productService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }

    protected function getListConfig(): array
    {
        return [
            'search_fields'   => Product::$searchableFields,
            'filters'         => Product::$filterable,
            'sorts'           => Product::$sortable,
            'relations'       => Product::$allowedIncludes,
            'default_includes'=> ['family', 'brand', 'productType', 'variants'],
            'default_sort'    => Product::$defaultSort,
            'default_per_page'=> Product::$defaultPerPage ?? 15,
            'per_page_limit'  => Product::$perPageLimit ?? 100,
            'cache_tags'      => ['products'],
        ];
    }
}
