<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\PortalOrder;
use App\Models\PortalUser;
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
            // البوابة الرئيسية: عند تعطيل طلبات السلعة يُرفض عرض الكتالوج أيضاً.
            $this->assertOrdersEnabled();

            // الزائر (بدون توكن) يحتاج إذن الزوار للاطلاع على الكتالوج.
            if (!$request->bearerToken()) {
                $this->assertGuestOrdersAllowed();
            }
            // نقطة بيع واحدة للجميع: المستخدم المعتمد (Bearer portal token) يحصل
            // على كتالوجه بحالته الجبائية ومستوى سعره الشخصي، والزائر بدون توكن
            // يحصل على كتالوج المؤسسة الافتراضي. `optionalPortalUser` يحل الزبون
            // إن وُجد توكن صالح دون أن يُلزم المسار بمصادقة portal.auth.
            $portal = $this->optionalPortalUser($request);
            $party  = $portal?->party;
            if ($portal) {
                $this->assertRegisteredOrdersAllowed($portal);
            }
            $partyIsTvaExempt = (bool) ($party?->is_tva_exempt ?? false);

            // نفس مستوى السعر الذي يحاسب به محرك الطلبات (createDocumentLines):
            // مستوى الزبون إن وُجد، وإلا المستوى الافتراضي للمؤسسة.
            $priceLevelId = $party?->default_price_level_id
                ? (int) $party->default_price_level_id
                : $this->defaultPriceLevelId();

            return $this->catalogPayload($request, $partyIsTvaExempt, $priceLevelId, 'تم جلب كتالوج المنتجات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.catalog');
        }
    }

    /**
     * إنشاء طلب — نقطة واحدة للجميع:
     *   - مستخدم بوابة معتمد: يُربط الطلب بزبونه (السلوك الأصلي دون تغيير).
     *   - زائر (بدون توكن): يرسل customer_name + customer_phone (+ عنوان
     *     اختياري) ويُربط الطلب بزبون الصندوق الافتراضي (Client Cash) —
     *     بيانات الزبون الحقيقية تبقى على الطلب نفسه (customer_*).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $portal = $this->optionalPortalUser($request);

            // البوابات: معطل كلياً → ممنوع؛ زائر → يتطلب إذن الزوار؛ معتمد →
            // يتطلب إذن أصحاب الحسابات.
            $this->assertOrdersEnabled();
            $portal
                ? $this->assertRegisteredOrdersAllowed($portal)
                : $this->assertGuestOrdersAllowed();

            $validated = $this->validatePayload($request);

            $payload = [
                'lines' => $validated['items'],
                'notes' => $validated['notes'] ?? null,
            ];

            if ($portal) {
                $partyId = (int) $portal->party_id;
            } else {
                $companyId = (int) app(CompanyContextService::class)->get();
                $customerName  = trim((string) $request->input('customer_name', ''));
                $customerPhone = trim((string) $request->input('customer_phone', ''));
                if ($customerName === '' || $customerPhone === '') {
                    return $this->errorResponse('الاسم ورقم الهاتف مطلوبان لإرسال طلب السلعة.', 422);
                }

                $payload['customer_name']    = $customerName;
                $payload['customer_phone']   = $customerPhone;
                $payload['customer_address'] = $request->filled('customer_address')
                    ? trim((string) $request->input('customer_address'))
                    : null;

                $partyId = $this->orders->resolveCashPartyId($companyId);
            }

            $order = $this->orders->create($payload, $partyId);

            return $this->successResponse($this->orders->toArray($order, PortalOrder::CHANGED_BY_CUSTOMER), 'تم إرسال طلب السلعة بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.store');
        }
    }

    /**
     * تتبع طلب من الزائر (بدون حساب) — نقطة عامة كالكتالوج والإنشاء:
     * يبحث في طلبات المؤسسة عن الطلبات العامة (customer_name غير فارغ) التي
     * سُجِّلت برقم الهاتف المطلوب ويعيدها بحالتها الحالية. القاعدة الأمنية:
     * لا تُعاد أبداً طلبات أصحاب حسابات البوابة (customer_name = null) — فقط
     * طلبات الزوار المجهولة التي تتطابق مع الرقم المُرسل.
     */
    public function track(Request $request): JsonResponse
    {
        try {
            // التتبع ميزة الزوار — يتطلب تفعيل البوابة وإذن الزوار.
            $this->assertOrdersEnabled();
            $this->assertGuestOrdersAllowed();

            $validated = $request->validate([
                'phone'     => ['required', 'string', 'max:40'],
                'reference' => ['nullable', 'string', 'max:255'],
            ]);

            $companyId = (int) app(CompanyContextService::class)->get();
            $phone     = trim($validated['phone']);
            $reference = trim((string) ($validated['reference'] ?? ''));

            $query = PortalOrder::query()
                ->with(['document.documentType', 'document.lines.product.tva', 'document.lines.product.unit', 'histories'])
                ->where('company_id', $companyId)
                ->whereNotNull('customer_name')
                ->where('customer_phone', $phone)
                ->orderByDesc('id');

            if ($reference !== '') {
                $query->where('reference', 'like', "%{$reference}%");
            }

            $rows = $query->limit(20)->get();

            return $this->successResponse(
                $rows->map(fn(PortalOrder $o) => $this->orders->toArray($o, PortalOrder::CHANGED_BY_CUSTOMER))->values()->all(),
                'تم جلب طلباتك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.track');
        }
    }

    /**
     * حل زبون بوابة "اختياري" — نفس منطق PortalAuthenticate::resolvePortalUser
     * لكن دون رفض الطلب عند غياب التوكن: يعيد null للزائر. يُستعمل فقط في
     * مسارات الطلبات العامة (الكتالوج + الإنشاء) التي تخدم المعتمد والزائر معاً.
     */
    private function optionalPortalUser(Request $request): ?PortalUser
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return null;
        }

        $tokenable = $accessToken->tokenable;

        return $tokenable instanceof PortalUser && $tokenable->is_active
            ? $tokenable
            : null;
    }

    /**
     * بناء حمولة الكتالوج المشتركة (المعرَّف والعمومي) — نفس المنتجات والأسعار
     * والمخزون؛ الاختلاف الوحيد هو حالة الزبون الجبائية ومستوى السعر.
     */
    private function catalogPayload(Request $request, bool $partyIsTvaExempt, ?int $priceLevelId, string $message): JsonResponse
    {
        $search  = trim((string) $request->input('search'));
        $perPage = min(max((int) $request->input('per_page', 24), 1), 100);

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
                'image'         => $p->default_image ?? ($p->images[0] ?? null),
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

        return $this->successResponse($payload, $message);
    }

    public function index(Request $request): JsonResponse
    {
        try {
            // عرض سجل الطلبات يبقى متاحاً للزبون حتى لو أُوقفت إرسال الطلبات
            // (القراءة فقط) — البوابة الرئيسية portal_enabled فقط تمنعه.
            $this->assertOrdersEnabled();

            $partyId = (int) ($request->input('_portal_user')->party_id ?? 0);
            $rows    = $this->orders->paginate(
                $partyId,
                (string) $request->input('status', ''),
                (int) $request->input('per_page', 10)
            );

            $payload = [
                'data' => collect($rows->items())->map(fn(PortalOrder $o) => $this->orders->toArray($o, PortalOrder::CHANGED_BY_CUSTOMER))->all(),
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

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $this->assertOrdersEnabled();

            $portal  = $request->input('_portal_user');
            $this->assertRegisteredOrdersAllowed($portal);
            $partyId = (int) ($portal->party_id ?? 0);
            $order     = $this->findOwnOrder($partyId);
            $validated = $this->validatePayload($request, false);

            // notes-only: لا توجد items → لا تُمس الأسطر (التحديث مخصص للملاحظات)
            $payload = ['notes' => $validated['notes'] ?? null];
            if (array_key_exists('items', $validated)) {
                $payload['lines'] = $validated['items'];
            }

            $order = $this->orders->update($order, $payload);

            return $this->successResponse($this->orders->toArray($order, PortalOrder::CHANGED_BY_CUSTOMER), 'تم تعديل طلب السلعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.update');
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        try {
            $this->assertOrdersEnabled();

            $portal  = $request->input('_portal_user');
            $this->assertRegisteredOrdersAllowed($portal);
            $partyId = (int) ($portal->party_id ?? 0);
            $order   = $this->findOwnOrder($partyId);

            $order = $this->orders->changeStatus(
                $order,
                PortalOrder::STATUS_CANCELLED,
                PortalOrder::CHANGED_BY_CUSTOMER,
                $portal->name ?? null,
                'إلغاء الطلب من الزبون',
            );

            return $this->successResponse($this->orders->toArray($order, PortalOrder::CHANGED_BY_CUSTOMER), 'تم إلغاء الطلب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.cancel');
        }
    }

    public function validateOrder(Request $request): JsonResponse
    {
        try {
            $this->assertOrdersEnabled();

            $portal  = $request->input('_portal_user');
            $this->assertRegisteredOrdersAllowed($portal);
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

            return $this->successResponse($this->orders->toArray($order, PortalOrder::CHANGED_BY_CUSTOMER), 'تم تأكيد الطلب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.validate');
        }
    }

    public function showOrder(Request $request): JsonResponse
    {
        try {
            // القراءة (تفاصيل الطلب) متاحة دائماً للزبون — ليست فعلاً
            // يُقيَّد عند إيقاف إرسال الطلبات (فقط البوابة الرئيسية تمنعها).
            $this->assertOrdersEnabled();

            $partyId = (int) ($request->input('_portal_user')->party_id ?? 0);
            $order   = $this->findOwnOrder($partyId);

            return $this->successResponse($this->orders->toArray($order, PortalOrder::CHANGED_BY_CUSTOMER), 'تم جلب تفاصيل الطلب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.show');
        }
    }

    // ───────────────────────────── helpers ─────────────────────────────

    /**
     * قراءة إعداد من إعدادات بوابة الزبائن (company أو global) — نفس
     * البوابة التي تستعملها SettingsSeeder/SettingService.
     */
    private function portalSetting(string $key, mixed $default = null): mixed
    {
        $companyId = app(CompanyContextService::class)->get();

        return Setting::getSetting($key, $default, $companyId);
    }

    /**
     * بوابة الإعداد الرئيسي portal_enabled — عند تعطيلها تُرفض كل مسارات
     * طلبات السلعة (الكتالوج + الطلبات) برسالة واضحة (409).
     */
    private function assertOrdersEnabled(): void
    {
        if (!$this->portalSetting('portal_enabled', true)) {
            throw new \App\Core\Exceptions\BusinessRuleException('بوابة طلبات السلع معطلة حالياً من طرف الإدارة.', 409);
        }
    }

    /**
     * بوابة الزوار — عند تعطيل إرسال الطلبات من الزوار (بدون حساب) يُسمح
     * فقط لأصحاب حسابات البوابة.
     */
    private function assertGuestOrdersAllowed(): void
    {
        if (!$this->portalSetting('portal_allow_guest_orders', true)) {
            throw new \App\Core\Exceptions\BusinessRuleException('إرسال الطلبات متاح للزبائن المسجلين فقط — سجّل دخولك إلى البوابة أولاً.', 409);
        }
    }

    /**
     * بوابة أصحاب الحسابات — عند تعطيل طلبات المسجلين لا يمكن إنشاء أو
     * تعديل أو تأكيد أي طلب من الزبون (الإدارة تبقى قادرة على إدارة الطلبات).
     * كما تُطبَّق علامة الزبون الفردية portal_orders_enabled: حتى لو كانت
     * البوابة الإدارية مفعّلة، زبونٌ محدد بعلامة معطلة لا يستطيع الإرسال.
     */
    private function assertRegisteredOrdersAllowed(?PortalUser $portal = null): void
    {
        if (!$this->portalSetting('portal_allow_registered_orders', true)) {
            throw new \App\Core\Exceptions\BusinessRuleException('إرسال الطلبات من الزبائن المسجلين معطل حالياً من طرف الإدارة.', 409);
        }

        $party = $portal?->party;
        if ($party && !(bool) $party->portal_orders_enabled) {
            throw new \App\Core\Exceptions\BusinessRuleException('إرسال الطلبات معطل على حسابك الحالي — تواصل مع المؤسسة لتفعيله.', 409);
        }
    }

    /**
     * نقطة الإعدادات العامة للبوابة (بدون مصادقة) — تُقرأ من الإعدادات
     * وتعكس الأذونات الفعلية لحامل التوكن (أو الزائر):
     *   - enabled:      البوابة الإدارية portal_enabled
     *   - can_order:    هل يستطيع الزائر/المسجّل الحالي إرسال الطلبات فعلاً؟
     * يستهلكها المتجر للتحكم في الواجهة (بندرة عند التعطيل، منع الإرسال،
     * رسالة التأكيد المخصصة، وحدود المبلغ للتحقق المسبق على العميل).
     */
    public function config(Request $request): JsonResponse
    {
        try {
            $portal   = $this->optionalPortalUser($request);
            $party    = $portal?->party;

            $enabled          = (bool) $this->portalSetting('portal_enabled', true);
            $allowGuest       = (bool) $this->portalSetting('portal_allow_guest_orders', true);
            $allowRegistered  = (bool) $this->portalSetting('portal_allow_registered_orders', true);

            $partyEnabled = $party ? (bool) $party->portal_orders_enabled : null;
            $canOrder = $enabled && ($portal
                ? ($allowRegistered && $partyEnabled)
                : $allowGuest);

            return $this->successResponse([
                'enabled'                    => $enabled,
                'allow_guest_orders'         => $allowGuest,
                'allow_registered_orders'    => $allowRegistered,
                'min_order_amount'           => (float) $this->portalSetting('portal_min_order_amount', 0),
                'max_order_amount'           => (float) $this->portalSetting('portal_max_order_amount', 0),
                'order_confirmation_message' => (string) $this->portalSetting('portal_order_confirmation_message', ''),
                'authenticated'              => $portal !== null,
                'party_orders_enabled'       => $partyEnabled,
                'can_order'                  => (bool) $canOrder,

                // إعدادات عرض الكتالوج — تُقرأ من الإعدادات وتتحكم في واجهة
                // المتجر (إظهار/إخفاء السعر والمخزون والتعبئة والخصومات...).
                'show_stock'                 => (bool) $this->portalSetting('portal_show_stock', true),
                'show_price'                 => (bool) $this->portalSetting('portal_show_price', true),
                'show_ref'                   => (bool) $this->portalSetting('portal_show_ref', true),
                'show_unit'                  => (bool) $this->portalSetting('portal_show_unit', true),
                'show_packaging'             => (bool) $this->portalSetting('portal_show_packaging', true),
                'allow_change_packaging'     => (bool) $this->portalSetting('portal_allow_change_packaging', true),
                'show_discounts'             => (bool) $this->portalSetting('portal_show_discounts', true),
                'show_tva'                   => (bool) $this->portalSetting('portal_show_tva', true),
                'show_search'                => (bool) $this->portalSetting('portal_show_search', true),
                'hide_out_of_stock'          => (bool) $this->portalSetting('portal_hide_out_of_stock', false),
                'show_incart_badge'          => (bool) $this->portalSetting('portal_show_incart_badge', true),
                'show_notes'                 => (bool) $this->portalSetting('portal_show_notes', true),

                // الدفع الإلكتروني — يُظهر زر الدفع في المتجر فقط عند التفعيل.
                'online_payment_enabled'     => (bool) $this->portalSetting('online_payment_enabled', false),
            ], 'تم جلب إعدادات البوابة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.config');
        }
    }

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

    protected function validatePayload(Request $request, bool $requireItems = true): array
    {
        $validated = $request->validate([
            // items اختياري فقط في مسار التعديل (تحديث ملاحظات بدون لمس الأسطر)
            'items'                => $requireItems ? ['required', 'array', 'min:1'] : ['sometimes', 'array', 'min:1'],
            'items.*.product_id'   => ['required_with:items', 'integer'],
            'items.*.packaging_id' => ['nullable', 'integer'],
            'items.*.quantity'     => ['required_with:items', 'numeric', 'min:0.01'],
            'notes'                => ['nullable', 'string', 'max:1000'],
        ]);

        // تجميع السطور المكررة للمنتج (نفس التعبئة) في سطر واحد
        $grouped = [];
        foreach (($validated['items'] ?? []) as $entry) {
            $key = (int) $entry['product_id'] . ':' . (int) ($entry['packaging_id'] ?? 0);
            $grouped[$key] = [
                'product_id'   => (int) $entry['product_id'],
                'packaging_id' => isset($entry['packaging_id']) && $entry['packaging_id'] !== null
                    ? (int) $entry['packaging_id']
                    : null,
                'quantity'     => ($grouped[$key]['quantity'] ?? 0) + (float) $entry['quantity'],
            ];
        }

        // المفتاح items حاضر فقط إن أرسله الزبون فعلاً (store: إلزامي،
        // update: غيابه = تحديث ملاحظات فقط بلا لمس الأسطر)
        $result = ['notes' => $validated['notes'] ?? null];
        if (array_key_exists('items', $validated)) {
            $result['items'] = array_values($grouped);
        }

        return $result;
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
