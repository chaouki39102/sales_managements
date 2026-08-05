<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\PortalOrder;
use App\Services\Portal\PortalOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PortalOrdersController — إدارة طلبات بوابة الزبائن (لوحة الإدارة)
 *
 * مسارات الإدارة (ضمن can:update_company في مجموعة المؤسسة):
 *   GET    /{company}/portal-orders                → قائمة الطلبات (فلترة بالحالة)
 *   GET    /{company}/portal-orders/{id}           → تفاصيل طلب (زبون + أسطر + سجل)
 *   PATCH  /{company}/portal-orders/{id}           → تغيير الحالة
 *   POST   /{company}/portal-orders/{id}/convert   → تحويل الطلب إلى فاتورة (FV/POS)
 *
 * القاعدة: كل منطق الطلب في PortalOrderService — الفاتورة تُنشأ عبر آلية التحويل
 * القياسية (DocumentConversionService) وعندها فقط تُفعَّل العمليات المالية.
 */
class PortalOrdersController extends BaseApiController
{
    protected string $resourceName = 'portal_orders';
    protected ?string $resourceClass = null;

    public function __construct(
        private PortalOrderService $orders,
    ) {
        parent::__construct();
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');

            $rows = $this->orders->paginate(
                null,
                (string) $request->input('status', ''),
                (int) $request->input('per_page', 15)
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

            return $this->successResponse($payload, 'تم جلب الطلبات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_index');
        }
    }

    public function summary(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');

            return $this->successResponse(
                $this->orders->summary(),
                'تم جلب ملخص الطلبات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_summary');
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');
            $resolvedId = $this->extractId($id);

            $order = PortalOrder::query()->findOrFail($resolvedId);

            $order = $this->orders->loadDetail($order);

            return $this->successResponse(
                array_merge(
                    $this->orders->toArray($order),
                    ['stock' => $this->orders->stockAvailabilityForOrder($order)],
                ),
                'تم جلب تفاصيل الطلب بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_show');
        }
    }

    public function updateLines(Request $request, $id): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');
            $resolvedId = $this->extractId($id);

            $order = PortalOrder::query()->findOrFail($resolvedId);

            $validated = $request->validate([
                'lines'                    => ['required', 'array', 'min:1'],
                'lines.*.line_id'          => ['nullable', 'integer'],
                'lines.*.product_id'       => ['nullable', 'integer'],
                'lines.*.quantity'         => ['required', 'numeric'],
                'lines.*.packaging_id'     => ['nullable', 'integer'],
                // المسؤول يملك تعديل السعر والخصم (وحدة HT + نسبة %)
                'lines.*.unit_price_ht'    => ['nullable', 'numeric', 'min:0'],
                'lines.*.discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            ]);

            $order = $this->orders->adminReplaceLines($order, $validated['lines']);

            return $this->successResponse(
                array_merge(
                    $this->orders->toArray($order),
                    ['stock' => $this->orders->stockAvailabilityForOrder($order)],
                ),
                'تم تحديث منتجات الطلب بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_update_lines');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');
            $resolvedId = $this->extractId($id);

            $order = PortalOrder::query()->findOrFail($resolvedId);

            $validated = $request->validate([
                'status' => ['required', 'string', 'in:' . implode(',', array_merge(PortalOrder::STATUSES, [PortalOrder::LEGACY_PENDING]))],
                'notes'  => ['nullable', 'string', 'max:1000'],
            ]);

            $order = $this->orders->changeStatus(
                $order,
                $validated['status'],
                PortalOrder::CHANGED_BY_ADMIN,
                auth()->user()?->name,
                $validated['notes'] ?? null,
            );

            return $this->successResponse($this->orders->toArray($order), 'تم تحديث حالة الطلب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_update');
        }
    }

    public function convert(Request $request, $id): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');
            $resolvedId = $this->extractId($id);

            $order = PortalOrder::query()->findOrFail($resolvedId);

            $targetCode = (string) $request->input('target', 'FV');
            $sale       = $this->orders->convertToSale($order, $targetCode);

            return $this->successResponse([
                'order' => $this->orders->toArray($order->fresh()->load('histories')),
                'sale'  => [
                    'id'              => $sale->id,
                    'document_number' => $sale->document_number,
                    'document_type'   => $sale->documentType?->code,
                    'net_to_pay'      => (float) $sale->net_to_pay,
                    'total_ttc'       => (float) $sale->total_ttc,
                    'document_date'   => $sale->document_date?->format('Y-m-d'),
                ],
            ], 'تم تحويل الطلب إلى فاتورة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.admin_convert');
        }
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
