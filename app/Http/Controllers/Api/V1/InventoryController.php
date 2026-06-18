<?php
// app/Http/Controllers/Api/V1/InventoryController.php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\InventoryStockService;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends BaseApiController
{
    protected string $resourceName = 'inventory';

    public function __construct(private InventoryStockService $inventoryStockService)
    {
        parent::__construct();
    }

    /**
     * المخزون الفعلي لكل المنتجات في تاريخ محدد
     *
     * GET /{company}/inventory/stock-at
     *
     * Params:
     *   date         string  YYYY-MM-DD  (اختياري — اليوم افتراضياً)
     *   warehouse_id integer             (اختياري — كل المستودعات افتراضياً)
     *   search       string              (اختياري)
     */
    public function stockAt(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $request->validate([
                'date'           => 'nullable|date_format:Y-m-d',
                'warehouse_id'   => 'nullable|integer|exists:warehouses,id',
                'search'         => 'nullable|string|max:100',
                'fiscal_year_id' => 'nullable|integer|exists:fiscal_years,id',
            ]);

            $date         = $request->input('date', now()->toDateString());
            $warehouseId  = $request->input('warehouse_id');
            $search       = $request->input('search');
            $fiscalYearId = $request->input('fiscal_year_id');

            $data = $this->inventoryStockService->getStockAt($date, $warehouseId, $search, $fiscalYearId);

            return $this->successResponse($data, 'تم جلب المخزون بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'stockAt');
        }
    }

    // ── الإجباريات لـ BaseApiController ──────────────────────────────────────

    protected function getService(): InventoryStockService
    {
        return $this->inventoryStockService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}
