<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreProductVariantRequest;
use App\Http\Requests\UpdateProductVariantRequest;
use App\Http\Resources\ProductVariantResource;
use App\Models\Barcode;
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

    // ملاحظة: تم إزالة index و show و destroy لأن BaseApiController
    // يقوم بالمهمة تلقائياً وبنفس المنطق الذي كتبته، إلا إذا أردت تخصيصاً شديداً.

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', $this->getModelClass());

            // تصحيح: استخدام الـ FormRequest يدوياً للحصول على البيانات المفلترة والتوافق مع الأب
            $validatedData = app(StoreProductVariantRequest::class)->validated();

            $variant = $this->service->create($validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم إنشاء المتغير بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('update', $variant);

            // تصحيح: استخدام الـ FormRequest يدوياً
            $validatedData = app(UpdateProductVariantRequest::class)->validated();

            $variant = $this->service->update($variant, $validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم تحديث المتغير'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

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

    public function barcodeSearch(Request $request): JsonResponse
    {
        try {
            $barcode = $request->input('barcode');
            if (!$barcode) {
                return $this->successResponse([], 'يجب إدخال باركود');
            }

            $companyId = $this->getCurrentCompanyId();

            // 1) Search by variant.barcode
            $variantIds = ProductVariant::where('company_id', $companyId)
                ->where('barcode', $barcode)
                ->where('active', true)
                ->pluck('id');

            // 2) Search via dedicated barcodes table → find product_id → find base variant
            if ($variantIds->isEmpty()) {
                $barcodeRecord = Barcode::where('company_id', $companyId)
                    ->where('barcode', $barcode)
                    ->first();

                if ($barcodeRecord) {
                    // Find the base variant (no attributes) for this product
                    $baseVariant = ProductVariant::where('company_id', $companyId)
                        ->where('product_id', $barcodeRecord->product_id)
                        ->where('active', true)
                        ->where(function ($q) {
                            $q->whereNull('variant_attributes')
                              ->orWhere('variant_attributes', '{}');
                        })
                        ->first();

                    if ($baseVariant) {
                        $variantIds = collect([$baseVariant->id]);
                    }
                }
            }

            if ($variantIds->isEmpty()) {
                return $this->successResponse([], 'لم يتم العثور على منتج بهذا الباركود');
            }

            $variants = ProductVariant::whereIn('id', $variantIds)
                ->with(['product.family', 'unit', 'tva', 'prices.priceLevel', 'packagings'])
                ->get();

            return $this->successResponse(
                ProductVariantResource::collection($variants),
                'تم العثور على المنتج'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'barcodeSearch');
        }
    }
}
