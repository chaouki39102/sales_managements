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

    public function indexByProduct(Request $request, $productId): JsonResponse
    {
        try {
            $product = Product::findOrFail($productId);
            $this->authorizeAction('viewAny', Barcode::class);
            $this->authorizeAction('view', $product);

            $data = $this->apiListWithCallback(
                Barcode::class,
                fn($query) => $query->where('product_id', $productId),
                $request,
                $this->getListConfig(),
            );

            return $this->successResponse($data, 'تم جلب باركودات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = app(StoreBarcodeRequest::class)->validated();

            $product = Product::findOrFail($validatedData['product_id']);
            $this->authorizeAction('create', [Barcode::class, $product]);

            $barcode = $this->barcodeService->create($validatedData, $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم إنشاء الباركود بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

// تغيير السطر 102 ليصبح:
public function update(Request $request, $id): JsonResponse
{
    try {
        // جلب الموديل يدوياً أو عبر السيرفس ليتوافق مع التوقيع
        $barcode = $this->barcodeService->findById($id);

        $this->authorizeAction('update', $barcode);

        // استخدام الـ Validation يدوياً بما أننا لم نمرره في التوقيع
        $validatedData = app(UpdateBarcodeRequest::class)->validated();

        $barcode = $this->barcodeService->update($barcode, $validatedData, $request);

        return $this->successResponse(
            new BarcodeResource($barcode->load('product')),
            'تم تحديث الباركود'
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'update');
    }
}

    public function destroy($id): JsonResponse
    {
        try {
            $barcode = $this->barcodeService->findById($id);
            $this->authorizeAction('delete', $barcode);
            $this->barcodeService->delete($barcode);

            return $this->successResponse(null, 'تم حذف الباركود');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }
}
