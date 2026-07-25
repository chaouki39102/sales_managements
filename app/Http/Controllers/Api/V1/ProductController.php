<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\QuantityDiscount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends BaseApiController
{
    protected string $resourceName = 'product';
    protected ?string $resourceClass = ProductResource::class;

    public function __construct(private ProductService $productService)
    {
        parent::__construct();
    }

    // ========== دوال إضافية فقط (غير موجودة في BaseApiController) ==========

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

    /**
     * بحث صور من مزود خارجي (Pexels) — لميزة "اقتراح صورة" في مودل المنتج.
     * القراءة فقط، بدون أي كتابة على المنتج؛ الإضافة الفعلية تتم من الواجهة
     * عبر تحديث حقل images الاعتيادي (update).
     */
    public function imageSearch(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $validated = $request->validate([
                'query'   => 'required|string|min:2|max:100',
                'page'    => 'nullable|integer|min:1|max:10',
                'barcode' => 'nullable|string|max:50',
            ]);

            $results = $this->productService->searchProductImages(
                $validated['query'],
                (int) ($validated['page'] ?? 1),
                $validated['barcode'] ?? null,
            );

            return $this->successResponse($results, 'تم جلب نتائج البحث عن الصور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'imageSearch');
        }
    }

    /**
     * نسخ تكوين (تعبئات + خصومات كمية) من منتج المصدر إلى منتجات هدف.
     * POST /products/copy-config
     */
    public function copyConfig(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'source_product_id'  => 'required|integer|exists:products,id',
                'target_product_ids' => 'required|array|min:1',
                'target_product_ids.*' => 'integer|exists:products,id',
                'copy_packaging'     => 'boolean',
                'copy_discounts'     => 'boolean',
                'replace_packaging'  => 'boolean',
                'replace_discounts'  => 'boolean',
            ]);

            $companyId = $request->_company->id;
            $source = Product::with(['packagings', 'quantityDiscounts'])
                ->where('company_id', $companyId)
                ->findOrFail($validated['source_product_id']);

            $copyPackaging     = $validated['copy_packaging'] ?? true;
            $copyDiscounts     = $validated['copy_discounts'] ?? true;
            $replacePackaging  = $validated['replace_packaging'] ?? false;
            $replaceDiscounts  = $validated['replace_discounts'] ?? false;
            $targetIds = $validated['target_product_ids'];

            $updated = 0;
            \DB::transaction(function () use ($source, $targetIds, $copyPackaging, $copyDiscounts, $replacePackaging, $replaceDiscounts, $companyId, &$updated) {
                foreach ($targetIds as $targetId) {
                    $target = Product::where('company_id', $companyId)->find($targetId);
                    if (!$target) continue;

                    if ($copyPackaging) {
                        if ($replacePackaging) {
                            ProductPackaging::where('product_id', $target->id)->delete();
                        }
                        $packagings = $source->packagings->map(fn($pkg) => [
                            'company_id'    => $target->company_id,
                            'product_id'    => $target->id,
                            'code'          => $pkg->code,
                            'label'         => $pkg->label,
                            'quantity'      => $pkg->quantity,
                            'barcode'       => $pkg->barcode,
                            'is_default'    => $pkg->is_default,
                            'active'        => $pkg->active,
                            'display_order' => $pkg->display_order,
                            'created_at'    => now(),
                            'updated_at'    => now(),
                        ]);
                        ProductPackaging::insert($packagings->toArray());
                    }

                    if ($copyDiscounts) {
                        if ($replaceDiscounts) {
                            QuantityDiscount::where('product_id', $target->id)->delete();
                        }
                        $discounts = $source->quantityDiscounts->map(fn($d) => [
                            'company_id'          => $target->company_id,
                            'product_id'          => $target->id,
                            'price_level_id'      => $d->price_level_id,
                            'min_qty'             => $d->min_qty,
                            'max_qty'             => $d->max_qty,
                            'discount_amount'     => $d->discount_amount,
                            'discount_percentage' => $d->discount_percentage,
                            'tier_order'          => $d->tier_order,
                            'is_blocked'          => $d->is_blocked,
                            'active'              => $d->active,
                            'created_at'          => now(),
                            'updated_at'          => now(),
                        ]);
                        QuantityDiscount::insert($discounts->toArray());
                    }

                    $target->update([
                        'manages_quantity_discounts' => $copyDiscounts ? true : $target->manages_quantity_discounts,
                    ]);

                    $updated++;
                }
            });

            return $this->successResponse(['updated' => $updated], "تم نسخ التكوين إلى {$updated} منتج");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'copyConfig');
        }
    }

    // ========== تجاوز الإعدادات الخاصة بالقائمة ==========

    protected function getListConfig(): array
    {
        return [
            'search_fields'   => Product::$searchableFields,
            'filters'         => Product::$filterable,
            'sorts'           => Product::$sortable,
            'relations'       => Product::$allowedIncludes,
            'default_includes'=> ['family', 'brand', 'productType', 'packagings', 'quantityDiscounts'],
            'default_sort'    => Product::$defaultSort,
            'default_per_page'=> Product::$defaultPerPage ?? 15,
            'per_page_limit'  => Product::$perPageLimit ?? 100,
            'cache_tags'      => ['products'],

        ];
    }

    // ========== الإجباريات لـ BaseApiController ==========

    protected function getService(): ProductService
    {
        return $this->productService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}
