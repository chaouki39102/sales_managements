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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ProductService extends \App\Core\Services\BaseService
{
    protected string $model        = Product::class;
    protected string $resourceName = 'product';
    protected function getResourceName(): string { return $this->resourceName; }

    protected array $defaultWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
    ];

    protected array $showWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
        'valuationMethod',
        'packagings',
        'prices.priceLevel',
        'quantityDiscounts.priceLevel',
    ];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, $request): array
{
    $data = parent::beforeCreate($data, $request); // ← أضف هذا السطر

    $companyId = app(\App\Services\CompanyContextService::class)->get();
    $company = $companyId ? Company::find($companyId) : null;

    if ($company && $company->products()->count() >= $company->max_products) {
        throw new BusinessRuleException("وصلت الشركة للحد الأقصى من المنتجات ({$company->max_products})", 422);
    }

    return $data;
}

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['packagings'])) {
            $this->syncPackagings($item, $data['packagings']);
        } else {
            $item->packagings()->create([
                'code'          => '1',
                'label'         => 'unite',
                'quantity'      => 1,
                'is_default'    => true,
                'active'        => true,
                'display_order' => 1,
            ]);
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


    }

    protected function prepareDataForUpdate(Model $item, array $data, $request): array
{
    $data = parent::prepareDataForUpdate($item, $data, $request); // ← أضف
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

    public function findById($id, ?array $with = null): Model
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
    // Image Search — مصادر متعددة مرتّبة حسب الدقة
    // =========================================================

    /**
     * مواقع جزائرية حقيقية مبنية على WooCommerce — تُستعلم عبر الـ Store API
     * الرسمي والعام (بدون مفتاح، بدون سكرابينغ HTML). هذا API مصمم أصلاً
     * للاستهلاك البرمجي الخارجي، وليس "زحفاً" على الموقع.
     *
     * ملاحظة: موقعا tidjaria وcorailmarket (PrestaShop) غير مُدرجين هنا
     * لأن robots.txt الخاص بهما يمنع الوصول الآلي صراحة، ولأنه لا يوجد
     * API عام موثّق لهما. تغطيتهما تتم فقط عبر Google Custom Search
     * (استعلام لفهرس Google العام، لا يزحف الموقع مباشرة).
     */
    protected array $algerianWooSites = [
        'https://www.taibaoline.com',
        'https://superette-dz.com',
        'https://areej.store',
        'https://shopicornermarket.com',
        'https://topribejaia.com',
    ];

    private function searchAlgerianStores(string $query): array
    {
        $cacheKey = 'dz_stores_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($query) {
            try {
                $responses = Http::pool(fn ($pool) => collect($this->algerianWooSites)
                    ->map(fn ($site) => $pool->as($site)
                        ->timeout(6)
                        ->get(rtrim($site, '/') . '/wp-json/wc/store/v1/products', [
                            'search'   => $query,
                            'per_page' => 6,
                        ])
                    )->all()
                );
            } catch (\Throwable $e) {
                Log::warning('Algerian stores search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            $results = [];
            foreach ($this->algerianWooSites as $site) {
                $response = $responses[$site] ?? null;
                if (!$response instanceof \Illuminate\Http\Client\Response || !$response->successful()) {
                    continue;
                }
                $host = parse_url($site, PHP_URL_HOST);
                foreach ((array) $response->json() as $product) {
                    $images = $product['images'] ?? [];
                    if (empty($images)) continue;
                    $img = $images[0];
                    $full = $img['src'] ?? null;
                    if (!$full) continue;
                    $results[] = [
                        'id'     => 'dz-' . md5($site . ($product['id'] ?? uniqid())),
                        'thumb'  => $img['thumbnail'] ?? $full,
                        'full'   => $full,
                        'source' => $host,
                    ];
                }
            }

            return $results;
        });
    }

    /**
     * Open Food Facts — مطابقة دقيقة بالباركود. مُنقولة إلى الباك-إند لأن
     * world.openfoodfacts.org لا يُرسل رؤوس CORS على مسارات الـ API القديمة
     * (cgi/search.pl)، فيفشل الطلب عند تنفيذه مباشرة من المتصفح.
     * الطلبات من الخادم لا تخضع لسياسة CORS، لذا هذا هو الحل الصحيح.
     */
    private function searchOpenFoodFactsByBarcode(string $barcode): ?array
    {
        $barcode = trim($barcode);
        if ($barcode === '') return null;

        $cacheKey = 'off_barcode:' . md5($barcode);

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($barcode) {
            try {
                $response = Http::withHeaders([
                        // Open Food Facts يشترط User-Agent مميز لتطبيقك
                        'User-Agent' => 'BusinessPlusDZ/1.0 (contact: support@businessplus.dz)',
                    ])
                    ->timeout(6)
                    ->get("https://world.openfoodfacts.org/api/v2/product/{$barcode}.json", [
                        'fields' => 'code,product_name,image_url,image_front_url',
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Open Food Facts barcode lookup failed', ['error' => $e->getMessage(), 'barcode' => $barcode]);
                return null;
            }

            if (!$response->successful() || (int) $response->json('status') !== 1) return null;

            $product = $response->json('product', []);
            $img = $product['image_front_url'] ?? $product['image_url'] ?? null;
            if (!$img) return null;

            return [
                'id'    => 'off-bc-' . ($product['code'] ?? $barcode),
                'thumb' => $img,
                'full'  => $img,
                'exact' => true,
                'label' => 'مطابقة بالباركود',
            ];
        });
    }

    /**
     * Open Food Facts — بحث نصي بالاسم (منتجات حقيقية بصور تعبئتها الفعلية).
     */
    private function searchOpenFoodFactsByName(string $query): array
    {
        $cacheKey = 'off_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($query) {
            try {
                $response = Http::withHeaders([
                        'User-Agent' => 'BusinessPlusDZ/1.0 (contact: support@businessplus.dz)',
                    ])
                    ->timeout(6)
                    ->get('https://world.openfoodfacts.org/cgi/search.pl', [
                        'search_terms' => $query,
                        'search_simple'=> 1,
                        'action'       => 'process',
                        'json'         => 1,
                        'page_size'    => 16,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Open Food Facts text search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) return [];

            return collect($response->json('products', []))
                ->map(fn (array $p) => [
                    'id'    => 'off-' . ($p['code'] ?? uniqid()),
                    'thumb' => $p['image_front_small_url'] ?? $p['image_small_url'] ?? $p['image_url'] ?? null,
                    'full'  => $p['image_front_url'] ?? $p['image_url'] ?? null,
                ])
                ->filter(fn (array $r) => $r['thumb'] && $r['full'])
                ->values()
                ->all();
        });
    }

    /**
     * Google Custom Search (مقيّد بالمواقع الجزائرية من لوحة تحكم الـ CSE نفسها).
     * يُعيد مصفوفة فارغة بهدوء إن لم يُضبط المفتاح بعد — لا يكسر البحث.
     */
    private function searchGoogleImages(string $query): array
    {
        $apiKey = config('services.google_cse.key');
        $cx     = config('services.google_cse.cx');

        if (empty($apiKey) || empty($cx)) {
            return [];
        }

        $cacheKey = 'google_cse_search:' . md5(mb_strtolower($query));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($apiKey, $cx, $query) {
            try {
                $response = Http::timeout(8)->get('https://www.googleapis.com/customsearch/v1', [
                    'key'        => $apiKey,
                    'cx'         => $cx,
                    'q'          => $query,
                    'searchType' => 'image',
                    'num'        => 10,
                    'safe'       => 'active',
                ]);
            } catch (\Throwable $e) {
                Log::warning('Google CSE search failed', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) return [];

            return collect($response->json('items', []))
                ->map(fn (array $it) => [
                    'id'     => 'g-' . md5($it['link'] ?? uniqid()),
                    'thumb'  => $it['image']['thumbnailLink'] ?? $it['link'] ?? null,
                    'full'   => $it['link'] ?? null,
                    'source' => $it['displayLink'] ?? null,
                ])
                ->filter(fn (array $r) => $r['thumb'] && $r['full'])
                ->values()
                ->all();
        });
    }

    /**
     * Pexels — احتياطي عام (صور ستوك، ليست منتجات حقيقية بالضرورة).
     * يُستدعى فقط عند نقص النتائج من المصادر الأدق أعلاه.
     */
    private function searchPexelsImages(string $query, int $page = 1): array
    {
        $apiKey = config('services.pexels.key');
        if (empty($apiKey)) return [];

        $cacheKey = 'pexels_image_search:' . md5(mb_strtolower($query) . '|' . $page);

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($apiKey, $query, $page) {
            try {
                $response = Http::withHeaders(['Authorization' => $apiKey])
                    ->timeout(8)
                    ->get('https://api.pexels.com/v1/search', [
                        'query'    => $query,
                        'per_page' => 24,
                        'page'     => $page,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Pexels image search failed (connection)', ['error' => $e->getMessage(), 'query' => $query]);
                return [];
            }

            if (!$response->successful()) {
                Log::warning('Pexels image search failed (http)', ['status' => $response->status(), 'query' => $query]);
                return [];
            }

            return collect($response->json('photos', []))
                ->map(function (array $p) {
                    $src = $p['src'] ?? [];
                    return [
                        'id'           => (string) ($p['id'] ?? ''),
                        'thumb'        => $src['medium'] ?? $src['small'] ?? null,
                        'full'         => $src['large2x'] ?? $src['large'] ?? $src['original'] ?? null,
                        'photographer' => $p['photographer'] ?? null,
                    ];
                })
                ->filter(fn (array $p) => $p['id'] !== '' && $p['thumb'] && $p['full'])
                ->values()
                ->all();
        });
    }

    /**
     * نقطة الدخول الموحّدة لميزة "اقتراح صورة": تدمج المصادر بترتيب الدقة —
     *   1) مطابقة الباركود عبر Open Food Facts (إن وُجد باركود) — دقة مطلقة
     *   2) Google المقيّد بالمواقع الجزائرية + متاجر جزائرية حقيقية عبر Store API
     *   3) Open Food Facts بحث نصي — منتجات حقيقية عالمية
     *   4) Pexels كاحتياطي فقط عند نقص النتائج
     * مع إزالة التكرار حسب رابط الصورة الكامل.
     */
    public function searchProductImages(string $query, int $page = 1, ?string $barcode = null): array
    {
        $query = trim($query);
        if ($query === '') return [];

        $barcodeMatch = $barcode ? $this->searchOpenFoodFactsByBarcode($barcode) : null;

        $merged = array_merge(
            $this->searchGoogleImages($query),
            $this->searchAlgerianStores($query),
            $this->searchOpenFoodFactsByName($query),
        );

        if (count($merged) < 6) {
            $merged = array_merge($merged, $this->searchPexelsImages($query, $page));
        }

        if ($barcodeMatch) {
            array_unshift($merged, $barcodeMatch);
        }

        $seen   = [];
        $unique = [];
        foreach ($merged as $item) {
            if (empty($item['full']) || isset($seen[$item['full']])) continue;
            $seen[$item['full']] = true;
            $unique[] = $item;
        }

        return $unique;
    }

    // =========================================================
    // Slug Helper
    // =========================================================


}
