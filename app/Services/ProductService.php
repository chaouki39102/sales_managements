<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductVariantPrice;
use App\Models\QuantityDiscount;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Product Service
 *
 * إدارة كاملة للمنتجات مع:
 * - إدارة المتغيرات (Variants) — إنشاء / تحديث / حذف
 * - إدارة مستويات الأسعار (ProductVariantPrice)
 * - إدارة تخفيضات الكميات (QuantityDiscount)
 * - التحقق من قواعد العمل
 *
 * @package App\Services
 */
class ProductService extends \App\Core\Services\BaseService
{
    protected string $model = Product::class;
    protected string $resourceName = 'product';
    protected array $defaultWith = ['family', 'brand', 'productType'];
    protected array $showWith    = ['variants.prices', 'variants.quantityDiscounts'];

    // =========================================================
    // Hooks — قبل / بعد العمليات
    // =========================================================

    /**
     * قبل الإنشاء: توليد الـ slug تلقائياً
     */
    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name']);
        }
        return $data;
    }

    /**
     * بعد إنشاء المنتج داخل Transaction:
     * نُنشئ المتغيرات وأسعارها وخصوماتها.
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['variants'])) {
            $this->syncVariants($item, $data['variants']);
        }
    }

    /**
     * قبل التحديث: قواعد العمل + slug
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // لا يمكن تعطيل منتج له متغيرات نشطة
        if (isset($data['active']) && !$data['active'] && $item->variants()->where('active', true)->exists()) {
            throw new BusinessRuleException('لا يمكن تعطيل منتج له متغيرات نشطة', 409);
        }

        if (isset($data['name']) && $data['name'] !== $item->name) {
            $data['slug'] = $this->generateUniqueSlug($data['name'], $item->id);
        }
    }

    /**
     * تجهيز البيانات للتحديث:
     * نفصل variants عن بيانات المنتج الأساسية.
     */
    protected function prepareDataForUpdate(Model $item, array $data, $request): array
    {
        // نزيل variants من البيانات لأنها تُعالَج منفصلاً في afterUpdate
        unset($data['variants']);
        return $data;
    }

    /**
     * بعد تحديث المنتج داخل Transaction:
     * نزامن المتغيرات.
     */
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        // $data هنا البيانات الأصلية (قبل prepareDataForUpdate)
        // نمرر $request->input('variants') مباشرة
        $variants = $request?->input('variants') ?? $data['variants'] ?? null;

        if (!is_null($variants)) {
            $this->syncVariants($item, $variants);
        }
    }

    /**
     * قبل الحذف: لا نحذف منتجاً له معاملات تجارية
     */
    protected function beforeDelete(Model $item): void
    {
        if ($item->variants()->whereHas('commercialDocumentLines')->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج مرتبط بوثائق تجارية', 409);
        }
    }

    // =========================================================
    // Variant Sync — القلب النابض
    // =========================================================

    /**
     * مزامنة المتغيرات (إنشاء / تحديث / حذف)
     *
     * الاستراتيجية:
     * - المتغيرات التي لها id موجود → UPDATE
     * - المتغيرات بدون id → CREATE
     * - المتغيرات الموجودة في DB لكن غائبة من الطلب → DELETE (soft)
     */
    private function syncVariants(Product $product, array $variantsData): void
    {
        $incomingIds = collect($variantsData)
            ->pluck('id')
            ->filter()
            ->values()
            ->toArray();

        // 1. حذف المتغيرات المحذوفة من الفورم
        $product->variants()
            ->whereNotIn('id', $incomingIds)
            ->each(function (ProductVariant $variant) {
                // حذف ناعم إن كان SoftDeletes مفعلاً، وإلا قوة
                $variant->prices()->delete();
                $variant->quantityDiscounts()->delete();
                $variant->delete();
            });

        // 2. إنشاء أو تحديث كل متغير
        foreach ($variantsData as $vData) {
            if (!empty($vData['id'])) {
                $variant = $product->variants()->find($vData['id']);
                if ($variant) {
                    $this->updateVariant($variant, $vData);
                }
            } else {
                $this->createVariant($product, $vData);
            }
        }
    }

    /**
     * إنشاء متغير جديد مع أسعاره وخصوماته
     */
    private function createVariant(Product $product, array $data): ProductVariant
    {
        $variant = $product->variants()->create($this->prepareVariantData($data));

        $this->syncVariantPrices($variant, $data['prices'] ?? []);
        $this->syncQuantityDiscounts($variant, $data['quantity_discounts'] ?? [], $data['manages_quantity_discounts'] ?? false);

        return $variant;
    }

    /**
     * تحديث متغير موجود
     */
    private function updateVariant(ProductVariant $variant, array $data): ProductVariant
    {
        $variant->update($this->prepareVariantData($data));

        $this->syncVariantPrices($variant, $data['prices'] ?? []);
        $this->syncQuantityDiscounts($variant, $data['quantity_discounts'] ?? [], $data['manages_quantity_discounts'] ?? false);

        return $variant->refresh();
    }

    /**
     * تجهيز بيانات المتغير (تحويل الأسماء من Frontend → DB)
     */
    private function prepareVariantData(array $data): array
    {
        return [
            'ref'                        => $data['ref'],
            'variant_name'               => $data['variant_name'] ?? null,
            'barcode'                    => $data['barcode'] ?? null,
            'last_purchase_price'        => isset($data['last_purchase_price']) && $data['last_purchase_price'] !== ''
                                            ? (float) $data['last_purchase_price'] : null,
            'default_selling_price_ht'   => isset($data['default_selling_price_ht']) && $data['default_selling_price_ht'] !== ''
                                            ? (float) $data['default_selling_price_ht'] : 0,
            'tva_id'                     => $data['tva_id'] ?? null,
            'unit_id'                    => $data['unit_id'] ?? null,
            'min_stock_alert'            => $data['min_stock_alert'] ?? 0,
            'manages_stock'              => $data['manages_stock'] ?? true,
            'allow_negative_stock'       => $data['allow_negative_stock'] ?? false,
            'has_lots'                   => $data['has_lots'] ?? false,
            'has_expiration_date'        => $data['has_expiration_date'] ?? false,
            'manages_quantity_discounts' => $data['manages_quantity_discounts'] ?? false,
            'weight'                     => $data['weight'] ?? null,
            'volume'                     => $data['volume'] ?? null,
            'length'                     => $data['length'] ?? null,
            'width'                      => $data['width'] ?? null,
            'height'                     => $data['height'] ?? null,
            'variant_attributes'         => $data['variant_attributes'] ?? null,
            'valuation_method_id'        => $data['valuation_method_id'] ?? null,
            'active'                     => $data['active'] ?? true,
        ];
    }

    // =========================================================
    // Prices Sync
    // =========================================================

    /**
     * مزامنة أسعار المستويات للمتغير
     */
    private function syncVariantPrices(ProductVariant $variant, array $pricesData): void
    {
        if (empty($pricesData)) {
            return;
        }

        foreach ($pricesData as $priceData) {
            if (!isset($priceData['price_level_id'])) {
                continue;
            }

            $price = (float) ($priceData['price'] ?? 0);

            // إذا السعر فارغ / صفر، احذف السجل إن وجد
            if ($price <= 0) {
                $variant->prices()
                    ->where('price_level_id', $priceData['price_level_id'])
                    ->delete();
                continue;
            }

            $variant->prices()->updateOrCreate(
                ['price_level_id' => $priceData['price_level_id']],
                [
                    'price'      => $price,
                    'valid_from' => !empty($priceData['valid_from']) ? $priceData['valid_from'] : now()->toDateString(),
                    'valid_to'   => !empty($priceData['valid_to'])   ? $priceData['valid_to']   : null,
                    'active'     => $priceData['active'] ?? true,
                ]
            );
        }
    }

    // =========================================================
    // Quantity Discounts Sync
    // =========================================================

    /**
     * مزامنة تخفيضات الكميات للمتغير
     */
    private function syncQuantityDiscounts(ProductVariant $variant, array $discountsData, bool $manages): void
    {
        if (!$manages) {
            // إذا التخفيضات غير مفعلة → احذف الكل
            $variant->quantityDiscounts()->delete();
            return;
        }

        // حذف الكل وإعادة إنشاء (أبسط وأضمن)
        $variant->quantityDiscounts()->delete();

        foreach ($discountsData as $idx => $disc) {
            if (empty($disc['min_quantity'])) {
                continue;
            }
            if (empty($disc['discount_percentage']) && empty($disc['discount_per_unit'])) {
                continue;
            }

            $variant->quantityDiscounts()->create([
                'min_quantity'        => (float) $disc['min_quantity'],
                'max_quantity'        => isset($disc['max_quantity']) && $disc['max_quantity'] !== '' ? (float) $disc['max_quantity'] : null,
                'discount_percentage' => isset($disc['discount_percentage']) && $disc['discount_percentage'] !== '' ? (float) $disc['discount_percentage'] : null,
                'discount_per_unit'   => isset($disc['discount_per_unit']) && $disc['discount_per_unit'] !== '' ? (float) $disc['discount_per_unit'] : null,
                'tier_order'          => $idx + 1,
                'active'              => $disc['active'] ?? true,
                'valid_from'          => now()->toDateString(),
                'valid_to'            => null,
            ]);
        }
    }

    // =========================================================
    // Slug Helper
    // =========================================================

    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug = Str::slug($name);
        $query = Product::where('slug', 'like', $slug . '%');

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $existing = $query->pluck('slug');

        if (!$existing->contains($slug)) {
            return $slug;
        }

        $counter = 1;
        while ($existing->contains($slug . '-' . $counter)) {
            $counter++;
        }

        return $slug . '-' . $counter;
    }

    // =========================================================
    // Convenience Methods (للكنترولر)
    // =========================================================

    public function getActiveProducts()
    {
        return $this->model::active()->with($this->defaultWith)->get();
    }

    public function getByFamily(int $familyId)
    {
        return $this->model::byFamily($familyId)->active()->with($this->defaultWith)->get();
    }

    public function getByBrand(int $brandId)
    {
        return $this->model::byBrand($brandId)->active()->with($this->defaultWith)->get();
    }

    public function getWithVariants()
    {
        return $this->model::withVariants()->active()->with(array_merge($this->defaultWith, ['variants']))->get();
    }

    /**
     * جلب منتج بكل علاقاته للعرض/التعديل
     */
    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge(
            $this->defaultWith,
            $this->showWith
        ));
        return $this->model::with($relations)->findOrFail($id);
    }
}
