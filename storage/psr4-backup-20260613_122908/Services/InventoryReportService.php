<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use App\Services\CompanyContextService;

class InventoryReportService
{
    private function companyId(): int
    {
        return app(CompanyContextService::class)->get();
    }

    /**
     * تقرير حركات المخزون Pivot حسب العائلات والعلامات التجارية
     */
    public function getMovementsPivotReport(
        string $fromDate,
        string $toDate,
        ?array $familyIds = null
    ): Collection {
        $companyId = $this->companyId();

        $query = DB::table('stock_movements as sm')
            ->join('products as p', function ($j) use ($companyId) {
                $j->on('p.id', '=', 'sm.product_id')
                  ->where('p.company_id', $companyId); // ✅ عزل المنتجات
            })
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->leftJoin('brands as b', 'b.id', '=', 'p.brand_id')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->where('sm.company_id', $companyId)   // ✅ عزل الحركات
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'f.name as family_name',
                'b.name as brand_name',
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.quantity ELSE 0 END) as total_in_qty"),
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.total_price ELSE 0 END) as total_in_value"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.quantity ELSE 0 END) as total_out_qty"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.total_price ELSE 0 END) as total_out_value"),
                DB::raw('COUNT(DISTINCT sm.product_id) as unique_products')
            );

        if ($familyIds) {
            $query->whereIn('p.family_id', $familyIds);
        }

        return $query
            ->groupBy('f.name', 'b.name')
            ->orderBy('family_name')
            ->orderBy('brand_name')
            ->get()
            ->map(function ($item) {
                $item->total_in_qty    = (float) $item->total_in_qty;
                $item->total_out_qty   = (float) $item->total_out_qty;
                $item->total_in_value  = (float) $item->total_in_value;
                $item->total_out_value = (float) $item->total_out_value;
                return $item;
            });
    }

    /**
     * تقرير تفصيلي لحركات منتج معين
     */
    public function getProductMovementsDetail(
        int    $productId,
        int    $warehouseId,
        string $fromDate,
        string $toDate
    ): Collection {
        $companyId = $this->companyId();

        return DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->leftJoin('commercial_document_lines as cdl', 'cdl.id', '=', 'sm.commercial_document_line_id')
            ->leftJoin('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->where('sm.company_id', $companyId)   // ✅ عزل
            ->where('sm.product_id', $productId)
            ->where('sm.warehouse_id', $warehouseId)
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'sm.id',
                'sm.movement_date',
                'smt.label as movement_type',
                'smt.direction',
                'sm.quantity',
                'sm.unit_price',
                'sm.total_price',
                'sm.lot_number',
                'sm.stock_balance_after',
                'sm.notes',
                'cd.document_number',
                'cd.document_date'
            )
            ->orderBy('sm.movement_date')
            ->orderBy('sm.id')
            ->get();
    }

    /**
     * تقرير المخزون الحالي Pivot حسب العائلات
     */
    public function getCurrentStockPivotReport(?int $warehouseId = null): Collection
    {
        $companyId = $this->companyId();

        // آخر رصيد لكل (product, warehouse) — مفلتر بالشركة ✅
        $subQuery = DB::table('stock_movements as sm2')
            ->select('sm2.product_id', 'sm2.warehouse_id', 'sm2.stock_balance_after')
            ->where('sm2.company_id', $companyId)  // ✅
            ->whereIn('sm2.id', function ($q) use ($companyId) {
                $q->select(DB::raw('MAX(id)'))
                  ->from('stock_movements')
                  ->where('company_id', $companyId) // ✅
                  ->groupBy('product_id', 'warehouse_id');
            });

        if ($warehouseId) {
            $subQuery->where('sm2.warehouse_id', $warehouseId);
        }

        return DB::query()
            ->fromSub($subQuery, 'last_movements')
            ->join('products as p', function ($j) use ($companyId) {
                $j->on('p.id', '=', 'last_movements.product_id')
                  ->where('p.company_id', $companyId); // ✅
            })
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->select(
                'f.name as family_name',
                DB::raw('COUNT(DISTINCT p.id) as products_count'),
                DB::raw('SUM(last_movements.stock_balance_after) as total_quantity'),
                DB::raw('SUM(last_movements.stock_balance_after * p.current_cost_price) as total_value')
            )
            ->groupBy('f.name')
            ->orderBy('family_name')
            ->get()
            ->map(function ($item) {
                $item->total_quantity = (float) ($item->total_quantity ?? 0);
                $item->total_value    = (float) ($item->total_value ?? 0);
                $item->products_count = (int)   $item->products_count;
                return $item;
            });
    }

    /**
     * ملخص المخزون الحالي للـ Dashboard
     */
    public function getStockSummary(): array
    {
        $companyId = $this->companyId();

        $totals = DB::table('products as p')
            ->where('p.company_id', $companyId)
            ->selectRaw('
                COUNT(*) as total_products,
                SUM(CASE WHEN p.current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN p.current_stock > 0 AND p.current_stock <= p.min_stock_alert THEN 1 ELSE 0 END) as low_stock,
                SUM(p.current_stock * p.current_cost_price) as total_value
            ')
            ->first();

        return [
            'total_products' => (int)   ($totals->total_products ?? 0),
            'out_of_stock'   => (int)   ($totals->out_of_stock   ?? 0),
            'low_stock'      => (int)   ($totals->low_stock      ?? 0),
            'total_value'    => (float) ($totals->total_value    ?? 0),
        ];
    }

    /**
     * قائمة منتجات منخفضة أو نافدة المخزون
     */
    public function getLowStockProducts(?int $warehouseId = null): Collection
    {
        $companyId = $this->companyId();

        return DB::table('products as p')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->where('p.company_id', $companyId)
            ->where('p.active', true)
            ->where(function ($q) {
                $q->where('p.current_stock', '<=', 0)
                  ->orWhereColumn('p.current_stock', '<=', 'p.min_stock_alert');
            })
            ->select(
                'p.id',
                'p.name',
                'p.ref',
                'p.current_stock',
                'p.min_stock_alert',
                'p.current_cost_price',
                'f.name as family_name'
            )
            ->orderByRaw('p.current_stock ASC')
            ->get()
            ->map(function ($item) {
                $item->current_stock    = (float) $item->current_stock;
                $item->min_stock_alert  = (float) $item->min_stock_alert;
                $item->current_cost_price = (float) $item->current_cost_price;
                $item->status = $item->current_stock <= 0 ? 'out' : 'low';
                return $item;
            });
    }
}
