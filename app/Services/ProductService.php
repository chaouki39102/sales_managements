<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\ProductPrice;
use App\Models\QuantityDiscount;
use App\Core\Exceptions\BusinessRuleException;
use App\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ProductService extends \App\Core\Services\BaseService
{
    protected string $model        = Product::class;
    protected string $resourceName = 'product';

    protected array $defaultWith = [
        'family', 'brand', 'productType', 'tva', 'unit',
    ];

    protected array $showWith = [
        'family', 'brand', 'productType', 'tva', 'unit', 'valuationMethod',
        'packagings',
        'prices.priceLevel',
        'quantityDiscounts.priceLevel',
    ];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, $request): array
    {
        $company = Company::find(session('current_company_id'));
        if ($company && $company->products()->count() >= $company->max_products) {
            throw new BusinessRuleException("وصلت الشركة للحد الأقصى من المنتجات ({$company->max_products})", 422);
        }
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name']);
        }
        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['packagings'])) {
            $this->syncPackagings($item, $data['packagings']);
        }
        if (!empty($data['prices'])) {
            $this->syncPrices($item, $data['prices'], (float)($data['purchase_price_ht'] ?? 0));
        }
        if (isset($data['quantity_discounts'])) {
            $this->syncDiscounts($item, $data['quantity_discounts'], (bool)($data['manages_quantity_discounts'] ?? false));
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // التخفيف: لا نمنع تعطيل المنتج، فقط نسجل تحذيراً
        if (isset($data['active']) && !(bool)$data['active']) {
            if ($item->stockMovements()->where('is_validated', true)->exists()) {
                Log::warning('محاولة تعطيل منتج له حركات مخزون مؤكدة', [
                    'product_id' => $item->id,
                    'user_id' => auth()->id(),
                ]);
                // يمكنك اختيارياً إضافة رسالة إعلامية للمستخدم عبر session أو استثناء مخصص
                // throw new BusinessRuleException('لا يمكن تعطيل منتج له حركات مخزون مؤكدة', 409);
                // لكننا سنسمح بذلك مع تسجيل التحذير فقط.
            }
        }

        if (isset($data['name']) && $data['name'] !== $item->name && empty($data['slug'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, $request): array
    {
        unset($data['packagings'], $data['prices'], $data['quantity_discounts']);
        return $data;
    }

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $packagings = $request?->input('packagings');
        $prices     = $request?->input('prices');
        $discounts  = $request?->input('quantity_discounts');

        if (!is_null($packagings)) {
            $this->syncPackagings($item, $packagings);
        }

        if (!is_null($prices)) {
            $purchasePrice = (float)($request->input('purchase_price_ht') ?? $item->fresh()->purchase_price_ht);
            $this->syncPrices($item, $prices, $purchasePrice);
        }

        if (!is_null($discounts)) {
            $managesDiscounts = (bool)($request->input('manages_quantity_discounts') ?? $item->manages_quantity_discounts);
            $this->syncDiscounts($item, $discounts, $managesDiscounts);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // الحذف الفعلي ممنوع إذا كانت هناك سجلات مرتبطة (يبقى كما هو)
        if ($item->stockMovements()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له حركات مخزون', 409);
        }
        if ($item->lots()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له دفعات مخزون', 409);
        }
        if ($item->documentLines()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج مرتبط بمستندات تجارية', 409);
        }
        if ($item->openingBalances()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له أرصدة افتتاحية', 409);
        }
    }

    // =========================================================
    // Packagings Sync
    // =========================================================

    private function syncPackagings(Product $product, array $data): void
    {
        if (empty($data)) return;

        $incomingIds = collect($data)->pluck('id')->filter()->toArray();

        // حذف التعبئات الغائبة (هذا السلوك قد يكون مقصوداً، لكن يمكن تعديله لتعطيلها بدلاً من الحذف)
        $product->packagings()->whereNotIn('id', $incomingIds)->delete();

        $hasDefault = collect($data)->contains(fn($p) => !empty($p['is_default']));

        foreach ($data as $idx => $pData) {
            $attrs = [
                'code'          => strtoupper(trim($pData['code'])),
                'label'         => trim($pData['label']),
                'quantity'      => isset($pData['quantity']) ? max(0.0001, (float)$pData['quantity']) : 1,
                'barcode'       => $pData['barcode'] ?? null,
                'is_default'    => (bool)($pData['is_default'] ?? false),
                'active'        => (bool)($pData['active'] ?? true),
                'display_order' => (int)($pData['display_order'] ?? $idx),
            ];

            if (!empty($pData['id'])) {
                $product->packagings()->where('id', $pData['id'])->update($attrs);
            } else {
                $product->packagings()->create($attrs);
            }
        }

        if (!$hasDefault) {
            $smallest = $product->packagings()->orderBy('quantity')->first();
            $smallest?->update(['is_default' => true]);
        }
    }

    // =========================================================
    // Prices Sync
    // =========================================================

    private function syncPrices(Product $product, array $data, float $purchasePriceHt): void
    {
        if (empty($data)) return;

        foreach ($data as $pData) {
            if (empty($pData['price_level_id'])) continue;

            $method = $pData['pricing_method'] ?? 'fixed';

            $price  = $method === 'fixed'  ? ((float)($pData['price']  ?? 0)) : null;
            $rate   = $method === 'rate'   ? ((float)($pData['rate']   ?? 0)) : null;
            $margin = $method === 'margin' ? ((float)($pData['margin'] ?? 0)) : null;

            $product->prices()->updateOrCreate(
                ['price_level_id' => (int)$pData['price_level_id']],
                [
                    'pricing_method' => $method,
                    'price'          => $price,
                    'rate'           => $rate,
                    'margin'         => $margin,
                    'active'         => (bool)($pData['active'] ?? true),
                ]
            );
        }
    }

    // =========================================================
    // Discounts Sync — تعديل: لا نحذف، نعطل فقط
    // =========================================================

    private function syncDiscounts(Product $product, array $data, bool $managesDiscounts): void
    {
        if (!$managesDiscounts) {
            // بدلاً من delete()، نعطل الخصومات الحالية
            $product->quantityDiscounts()->update(['active' => false]);
            return;
        }

        // إذا كانت الخصومات مفعلة، نقوم بمزامنتها (ما زلنا نستخدم حذف وإعادة إنشاء للتبسيط)
        // لكن يمكن تحسينها لاحقاً.
        $product->quantityDiscounts()->delete();

        foreach ($data as $idx => $dData) {
            if (empty($dData['price_level_id'])) continue;
            if (!isset($dData['min_qty']) || $dData['min_qty'] === '') continue;
            if (empty($dData['discount_amount']) && empty($dData['discount_percentage'])) continue;

            $product->quantityDiscounts()->create([
                'price_level_id'      => (int)$dData['price_level_id'],
                'min_qty'             => (float)$dData['min_qty'],
                'max_qty'             => isset($dData['max_qty']) && $dData['max_qty'] !== '' ? (float)$dData['max_qty'] : null,
                'discount_amount'     => isset($dData['discount_amount']) && $dData['discount_amount'] !== '' ? (float)$dData['discount_amount'] : null,
                'discount_percentage' => isset($dData['discount_percentage']) && $dData['discount_percentage'] !== '' ? (float)$dData['discount_percentage'] : null,
                'tier_order'          => (int)($dData['tier_order'] ?? $idx + 1),
                'is_blocked'          => (bool)($dData['is_blocked'] ?? false),
                'active'              => (bool)($dData['active'] ?? true),
            ]);
        }
    }

    // =========================================================
    // Public Helpers
    // =========================================================

    public function findById($id, array $with = null): Model
    {
        return $this->model::with($with ?? $this->showWith)->findOrFail($id);
    }

    public function getActiveProducts()
    {
        return $this->model::where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByFamily(int $familyId)
    {
        return $this->model::where('family_id', $familyId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByBrand(int $brandId)
    {
        return $this->model::where('brand_id', $brandId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    // =========================================================
    // Slug Helper
    // =========================================================

    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug     = Str::slug($name);
        $query    = Product::where('slug', 'like', $slug . '%');
        if ($excludeId) $query->where('id', '!=', $excludeId);
        $existing = $query->pluck('slug');

        if (!$existing->contains($slug)) return $slug;

        $i = 1;
        while ($existing->contains("{$slug}-{$i}")) $i++;
        return "{$slug}-{$i}";
    }
}
