<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\PortalOrder;
use App\Models\PriceLevel;
use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\QuantityDiscount;
use App\Models\Setting;
use App\Services\CompanyContextService;
use App\Services\InventoryStockService;
use App\Services\Portal\PortalOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PortalOrderController — طلبات السلع من بوابة الزبائن (مبنية على المستندات التجارية)
 *
 * مسارات العميل (ضمن portal.auth):
 *   GET  /{company}/portal/orders           → قائمة طلبات الزبون
 *   GET  /{company}/portal/orders/catalog   → كتالوج المنتجات (سعر + مخزون + تعبئة)
 *   POST /{company}/portal/orders           → إنشاء طلب جديد
 *   PUT/PATCH /{company}/portal/orders/{id} → تعديل الطلب (فقط حالة «قيد الاعداد»)
 *   GET  /{company}/portal/orders/{id}      → تفاصيل طلب + سجل الحالة
 *   POST /{company}/portal/orders/{id}/validate → تأكيد الطلب من الزبون (قيد الاعداد → مؤكد)
 *   POST /{company}/portal/orders/{id}/cancel → إلغاء طلب قيد الاعداد
 *
 * القاعدة: كل منطق الطلب في PortalOrderService (معزول عن CommercialDocumentService).
 * الأسعار تُحسب في الخادم من جدول المنتجات — الزبون يرسل product_id + quantity + packaging_id فقط.
 */
class PortalOrderController extends BaseApiController
{
    protected string $resourceName = 'portal_order';
    protected ?string $resourceClass = null;

    public function __construct(
        private InventoryStockService $stockService,
        private PortalOrderService $orders,
    ) {
        parent::__construct();
    }

    /**
     * مستوى السعر الافتراضي الفعلي للمؤسسة (الإعداد، أو مستوى is_default).
     * يُحلّ مرة واحدة لكل طلب، ويطابق مستوى السعر الذي يعتمد عليه محرك
     * الطلبات في applicableDiscount عند إنشاء الطلب.
     */
    private ?int $resolvedDefaultPriceLevelId = null;

    private function defaultPriceLevelId(): ?int
    {
        if ($this->resolvedDefaultPriceLevelId !== null) {
            return $this->resolvedDefaultPriceLevelId;
        }

        $companyId = app(CompanyContextService::class)->get();
        $id        = null;

        if ($companyId) {
            $fromSetting = Setting::getSetting('default_price_level_id', null, $companyId);
            if ($fromSetting) {
                $id = (int) $fromSetting;
            }
            $id ??= PriceLevel::where('company_id', $companyId)
                ->where('is_default', true)
                ->value('id');
        }

        $this->resolvedDefaultPriceLevelId = $id !== null ? (int) $id : null;

        return $this->resolvedDefaultPriceLevelId;
    }

    public function catalog(Request $request): JsonResponse
    {
        try {
            $search  = trim((string) $request->input('search'));
            $perPage = min(max((int) $request->input('per_page', 24), 1), 100);

            // زبون البوابة المعتمد — نحتاج حالته الجبائية ومستوى السعر الشخصي
            // لنعرض بالضبط ما سيحاسَب عليه الطلب (لا نعرض TVA لزبون معفى،
            // ولا خصومات مستوى لا يطبّقها محرك الطلبات).
            $portal = $request->input('_portal_user');
            $party  = $portal?->party;
            $partyIsTvaExempt = (bool) ($party?->is_tva_exempt ?? false);

            // نفس مستوى السعر الذي يحاسب به محرك الطلبات (createDocumentLines):
            // مستوى الزبون إن وُجد، وإلا المستوى الافتراضي للمؤسسة. تُصفّى
            // خصومات الكميات بهذا المستوى حتى يطابق الكتالوج التحصيل الفعلي.
            $priceLevelId = $party?->default_price_level_id
                ? (int) $party->default_price_level_id
                : $this->defaultPriceLevelId();

            $query = Product::query()
                ->with(['tva', 'unit', 'prices', 'packagings', 'quantityDiscounts'])
                ->where('active', true)
                ->when($search !== '', fn($q) => $q->where(fn($w) => $w
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('ref', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                ))
                ->orderBy('name');

            $rows = $query->paginate($perPage);

            $stockRows = $this->stockService->getStockAt(now()->toDateString());
            $stockMap  = [];
            foreach ($stockRows as $row) {
                $stockMap[(int) $row['id']] = $row['current_stock'];
            }

            $items = collect($rows->items())->map(function (Product $p) use ($stockMap, $partyIsTvaExempt, $priceLevelId) {
                return [
                    'id'            => $p->id,
                    'name'          => $p->name,
                    'ref'           => $p->ref,
                    'barcode'       => $p->barcode,
                    'unit_price_ht' => round($p->default_selling_price_ht, 4),
                    'tva_rate'      => (float) ($p->tva?->rate ?? 0),
                    'unit'          => $p->unit
                        ? ['name' => $p->unit->name, 'symbol' => $p->unit->symbol]
                        : null,
                    'manages_stock' => (bool) $p->manages_stock,
                    'current_stock' => $p->manages_stock
                        ? ($stockMap[$p->id] ?? null)
                        : null,
                    'has_packaging' => $p->packagings->isNotEmpty(),
                    'packagings'    => $p->packagings
                        ->filter(fn(ProductPackaging $pk) => (bool) $pk->active)
                        ->map(fn(ProductPackaging $pk) => [
                            'id'              => $pk->id,
                            'code'            => $pk->code,
                            'label'           => $pk->label,
                            'quantity'        => (float) $pk->quantity,
                            'barcode'         => $pk->barcode,
                            'is_default'      => (bool) $pk->is_default,
                            'display_order'   => (int) $pk->display_order,
                            'pack_price_ht'   => round((float) $p->default_selling_price_ht * (float) $pk->quantity, 4),
                        ])
                        ->values()
                        ->all(),
                    // خصومات الكميات المفعّلة لمستوى السعر الذي يحاسب به محرك
                    // الطلبات (applicableDiscount) عند الإنشاء — مستوى الزبون
                    // الشخصي إن وُجد، وإلا المستوى الافتراضي للمؤسسة.
                    'manages_quantity_discounts' => (bool) $p->manages_quantity_discounts,
                    'party_is_tva_exempt' => $partyIsTvaExempt,
                    'discounts' => $p->quantityDiscounts
                        ->filter(fn(QuantityDiscount $d) => (bool) $d->active && !(bool) $d->is_blocked)
                        ->filter(fn(QuantityDiscount $d) => $priceLevelId
                            ? ((int) $d->price_level_id === (int) $priceLevelId)
                            : true)
                        ->map(fn(QuantityDiscount $d) => [
                            'id'                  => $d->id,
                            'price_level_id'      => $d->price_level_id !== null ? (int) $d->price_level_id : null,
                            'min_qty'             => (float) $d->min_qty,
                            'max_qty'             => $d->max_qty !== null ? (float) $d->max_qty : null,
                            'discount_percentage' => $d->discount_percentage !== null ? (float) $d->discount_percentage : null,
                            'discount_amount'     => $d->discount_amount !== null ? (float) $d->discount_amount : null,
                        ])
                        ->sortBy('min_qty')
                        ->values()
                        ->all(),
                ];
            })->values();

            $payload = [
                'data' => $items->all(),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page'    => $rows->lastPage(),
                    'per_page'     => $rows->perPage(),
                    'total'        => $rows->total(),
                ],
            ];

            return $this->successResponse($payload, 'تم جلب كتالوج المنتجات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.catalog');
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $partyId = (int) ($request->input('_portal_user')->party_id ?? 0);
            $rows    = $this->orders->paginate(
                $partyId,
                (string) $request->input('status', ''),
                (int) $request->input('per_page', 10)
            );

            $payload = [
                'data' => collect($rows->items())->map(fn(PortalOrder $o) => $this->orders->toArray($o))->all(),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page'    => $rows->lastPage(),
                    'per_page'     => $rows->perPage(),
                    'total'        => $rows->total(),
                ],
            ];

            return $this->successResponse($payload, 'تم جلب طلباتك بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.index');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $portal    = $request->input('_portal_user');
            $partyId   = (int) ($portal->party_id ?? 0);
            $validated = $this->validatePayload($request);

            $order = $this->orders->create([
                'lines' => $validated['items'],
                'notes' => $validated['notes'] ?? null,
            ], $partyId);

            return $this->successResponse($this->orders->toArray($order), 'تم إرسال طلب السلعة بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $portal    = $request->input('_portal_user');
            $partyId   = (int) ($portal->party_id ?? 0);
            $order     = $this->findOwnOrder($partyId);
            $validated = $this->validatePayload($request);

            $order = $this->orders->update($order, [
                'lines' => $validated['items'],
                'notes' => $validated['notes'] ?? null,
            ]);

            return $this->successResponse($this->orders->toArray($order), 'تم تعديل طلب السلعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.update');
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        try {
            $portal  = $request->input('_portal_user');
            $partyId = (int) ($portal->party_id ?? 0);
            $order   = $this->findOwnOrder($partyId);

            $order = $this->orders->changeStatus(
                $order,
                PortalOrder::STATUS_CANCELLED,
                PortalOrder::CHANGED_BY_CUSTOMER,
                $portal->name ?? null,
                'إلغاء الطلب من الزبون',
            );

            return $this->successResponse($this->orders->toArray($order), 'تم إلغاء الطلب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.cancel');
        }
    }

    public function validateOrder(Request $request): JsonResponse
    {
        try {
            $portal  = $request->input('_portal_user');
            $partyId = (int) ($portal->party_id ?? 0);
            $order   = $this->findOwnOrder($partyId);

            // الطريقة الاحترافية: الزبون يثبّت طلبه بنفسه (قيد الاعداد → مؤكد).
            // بعد التأكيد يدخل الطلب مرحلة تحليل المسؤول ولا يعود للزبون تصرف.
            $order = $this->orders->changeStatus(
                $order,
                PortalOrder::STATUS_CONFIRMED,
                PortalOrder::CHANGED_BY_CUSTOMER,
                $portal->name ?? null,
                'تأكيد الطلب من الزبون',
            );

            return $this->successResponse($this->orders->toArray($order), 'تم تأكيد الطلب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.validate');
        }
    }

    public function showOrder(Request $request): JsonResponse
    {
        try {
            $partyId = (int) ($request->input('_portal_user')->party_id ?? 0);
            $order   = $this->findOwnOrder($partyId);

            return $this->successResponse($this->orders->toArray($order), 'تم جلب تفاصيل الطلب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.show');
        }
    }

    // ───────────────────────────── helpers ─────────────────────────────

    protected function findOwnOrder(int $partyId): PortalOrder
    {
        $order = PortalOrder::query()
            ->where('party_id', $partyId)
            ->find($this->resolveRouteId());

        if (!$order) {
            abort(404, 'الطلب غير موجود.');
        }

        return $order;
    }

    protected function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'items'                => ['required', 'array', 'min:1'],
            'items.*.product_id'   => ['required', 'integer'],
            'items.*.packaging_id' => ['nullable', 'integer'],
            'items.*.quantity'     => ['required', 'numeric', 'min:0.01'],
            'notes'                => ['nullable', 'string', 'max:1000'],
        ]);

        // تجميع السطور المكررة للمنتج (نفس التعبئة) في سطر واحد
        $grouped = [];
        foreach ($validated['items'] as $entry) {
            $key = (int) $entry['product_id'] . ':' . (int) ($entry['packaging_id'] ?? 0);
            $grouped[$key] = [
                'product_id'   => (int) $entry['product_id'],
                'packaging_id' => isset($entry['packaging_id']) && $entry['packaging_id'] !== null
                    ? (int) $entry['packaging_id']
                    : null,
                'quantity'     => ($grouped[$key]['quantity'] ?? 0) + (float) $entry['quantity'],
            ];
        }

        return [
            'items' => array_values($grouped),
            'notes' => $validated['notes'] ?? null,
        ];
    }

    protected function getService(): mixed
    {
        return null;
    }

    protected function getModelClass(): string
    {
        return PortalOrder::class;
    }
}
