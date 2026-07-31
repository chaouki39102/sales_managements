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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
     * رفع صورة للمنتج من الجهاز
     *
     * يُخزّن الملف في storage/app/public/products/{id}/
     * يُضيف URL الصورة إلى مصفوفة images الموجودة.
     * يمسح أي ملفات قديمة لم تعد مشاراً إليها في المصفوفة.
     */
    public function uploadImage(Request $request, $id = null): JsonResponse
    {
        try {
            $id = $this->extractId($id);
            $product = Product::findOrFail($id);
            $this->authorizeAction('update', $product);

            $validated = $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            $file = $validated['image'];
            $images = $product->images ?? [];

            $saved = DB::transaction(function () use ($file, $product, $images, $id) {
                // 1. خزّن الملف باسم فريد: timestamp_random.extension
                $ext  = $file->getClientOriginalExtension();
                $name = time() . '_' . Str::random(8) . '.' . $ext;
                $path = $file->storeAs("products/{$id}", $name, 'public');
                if (!$path) {
                    throw new \RuntimeException('فشل تخزين الملف على القرص');
                }

                $url = asset('storage/' . $path);

                // 2. أضف URL إلى صور المنتج
                $images[] = $url;
                $product->update(['images' => $images]);

                return $url;
            });

            // 3. نظّف الملفات القديمة: احذف أي ملف مادي لم يعد موجوداً في images
            $this->pruneOrphanedFiles($product->fresh()->images ?? [], $id);

            return $this->successResponse(
                new ProductResource($product->fresh()),
                'تم رفع الصورة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'uploadImage');
        }
    }

    /**
     * حذف صورة منتج: يزيل الـ URL من مصفوفة images ثم يمسح الملف من القرص.
     * DELETE /products/{product}/image  { "image": "https://…/storage/products/1/x.png" }
     */
    public function deleteImage(Request $request, $id = null): JsonResponse
    {
        try {
            $id = $this->extractId($id);
            $product = Product::findOrFail($id);
            $this->authorizeAction('update', $product);

            $validated = $request->validate([
                'image' => 'required|string',
            ]);

            $target = $validated['image'];
            $images = array_values(array_filter(
                $product->images ?? [],
                fn ($url) => $url !== $target
            ));

            if (count($images) === count($product->images ?? [])) {
                throw new \RuntimeException('الصورة غير موجودة في قائمة صور المنتج');
            }

            $product->update(['images' => $images]);

            // احذف الملف المادي المرتبط بالـ URL المحذوف
            $disk = Storage::disk('public');
            $pos = strpos($target, '/storage/');
            if ($pos !== false) {
                $relative = substr($target, $pos + strlen('/storage/'));
                if ($relative) {
                    $disk->delete($relative);
                }
            }

            return $this->successResponse(
                new ProductResource($product->fresh()),
                'تم حذف الصورة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deleteImage');
        }
    }

    /**
     * يحذف من القرص أي ملفات صور لم تعد مشاراً إليها في مصفوفة images.
     *
     * المقارنة تتم على المسار النسبي (بعد /storage/) وليس على الـ URL الكامل،
     * لأن URL الصورة قد يُولَّد من asset() (يتضمن مجلد النشر) أو من أي مصدر آخر.
     */
    private function pruneOrphanedFiles(array $validUrls, int $productId): void
    {
        $disk = Storage::disk('public');
        $allFiles = $disk->files("products/{$productId}");

        $validPaths = [];
        foreach ($validUrls as $url) {
            if (!is_string($url)) continue;
            $pos = strpos($url, '/storage/');
            if ($pos !== false) {
                $validPaths[] = substr($url, $pos + strlen('/storage/'));
            }
        }

        foreach ($allFiles as $filePath) {
            if (!in_array($filePath, $validPaths, true)) {
                $disk->delete($filePath);
            }
        }
    }

    /**
     * نسخ تكوين (تعبئات + خصومات كمية) من منتج المصدر إلى منتجات هدف.
     * POST /products/copy-config
     */
    public function copyConfig(Request $request): JsonResponse
    {
        try {
            $companyId = $request->_company->id;
            $validated = $request->validate([
                'source_product_id'  => 'required|integer|exists:products,id',
                'target_product_ids' => 'required|array|min:1',
                'target_product_ids.*' => 'integer|exists:products,id',
                'copy_packaging'     => 'boolean',
                'copy_discounts'     => 'boolean',
                'replace_packaging'  => 'boolean',
                'replace_discounts'  => 'boolean',
            ]);

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

    /**
     * update — نفس منطق BaseApiController، مع تنظيف ملفات الصور المتروكة
     * بعد أي تحديث يغيّر مصفوفة images (حذف محلي ثم حفظ، اقتراح صورة خارجي…).
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item       = $this->getService()->findById($resolvedId);
            $this->authorizeAction('update', $item);
            $data = $this->getValidatedData($request, $resolvedId);
            $item = $this->getService()->update($item, $data, $request);

            $this->pruneOrphanedFiles($item->fresh()->images ?? [], $resolvedId);

            return $this->successResponse(
                $this->transformItem($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

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
