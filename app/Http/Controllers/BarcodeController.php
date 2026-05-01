<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreBarcodeRequest;
use App\Http\Requests\UpdateBarcodeRequest;
use App\Http\Resources\BarcodeResource;
use App\Models\Barcode;
use App\Models\Product;
use App\Services\BarcodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarcodeController extends BaseApiController
{
    protected string $resourceName = 'barcode';
    protected ?string $resourceClass = BarcodeResource::class;

    public function __construct(private BarcodeService $barcodeService)
    {
        parent::__construct();
    }

    protected function getService(): BarcodeService
    {
        return $this->barcodeService;
    }

    protected function getModelClass(): string
    {
        return Barcode::class;
    }

    protected function getListConfig(): array
    {
        return [
            'search_fields' => Barcode::$searchableFields,
            'filters' => Barcode::$filterable,
            'sorts' => Barcode::$sortable,
            'relations' => Barcode::$allowedIncludes,
            'default_includes' => Barcode::$defaultWith,
            'default_sort' => Barcode::$defaultSort,
            'default_per_page' => Barcode::$defaultPerPage,
            'per_page_limit' => Barcode::$perPageLimit,
            'cache_ttl' => Barcode::$cacheTtl,
            'cache_tags' => Barcode::$cacheTags,
        ];
    }

    /**
     * GET /api/v1/products/{product}/barcodes
     * قائمة باركودات منتج معين
     */
    public function indexByProduct(Request $request, Product $product): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Barcode::class);
            // التأكد من وصول المستخدم للمنتج
            $this->authorizeAction('view', $product);

            $data = $this->apiListWithCallback(
                Barcode::class,
                fn($query) => $query->where('product_id', $product->id),
                $request,
                $this->getListConfig(),
            );

            return $this->successResponse($data, 'تم جلب باركودات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }

    /**
     * POST /api/v1/barcodes
     * إضافة باركود جديد
     */
    public function store(StoreBarcodeRequest $request): JsonResponse
    {
        try {
            $product = Product::findOrFail($request->product_id);
            $this->authorizeAction('create', [Barcode::class, $product]);

            $barcode = $this->barcodeService->create($request->validated(), $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم إنشاء الباركود بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    /**
     * PUT|PATCH /api/v1/barcodes/{barcode}
     */
    public function update(UpdateBarcodeRequest $request, Barcode $barcode): JsonResponse
    {
        try {
            $this->authorizeAction('update', $barcode);
            $barcode = $this->barcodeService->update($barcode, $request->validated(), $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم تحديث الباركود'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    /**
     * DELETE /api/v1/barcodes/{barcode}
     */
    public function destroy(Barcode $barcode): JsonResponse
    {
        try {
            $this->authorizeAction('delete', $barcode);
            $this->barcodeService->delete($barcode);

            return $this->successResponse(null, 'تم حذف الباركود');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }
}
