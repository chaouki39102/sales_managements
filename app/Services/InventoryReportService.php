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
            ->join('stock_movement_types as smt', function ($j) use ($companyId) {
                $j->on('smt.id', '=', 'sm.stock_movement_type_id')
                  ->where('smt.company_id', $companyId);
            })
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
            ->join('stock_movement_types as smt', function ($j) use ($companyId) {
                $j->on('smt.id', '=', 'sm.stock_movement_type_id')
                  ->where('smt.company_id', $companyId);
            })
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
     *
     * جدول products لا يحتوي عمود current_stock — المخزون يُحسب من حركات
     * المخزون عبر InventoryStockService (المصدر المرجعي، مخزَّن 60 ثانية).
     */
    public function getStockSummary(?int $warehouseId = null): array
    {
        $companyId = $this->companyId();

        $outOfStock = 0;
        $lowStock   = 0;
        $totalValue = 0.0;

        foreach (app(InventoryStockService::class)->getStockAt(now()->toDateString(), $warehouseId) as $row) {
            $stock = (float) $row['current_stock'];

            if ($stock <= 0) {
                $outOfStock++;
            } elseif ($stock <= (float) $row['min_stock_alert']) {
                $lowStock++;
            }

            $totalValue += (float) $row['total_value'];
        }

        return [
            'total_products' => DB::table('products')
                ->where('company_id', $companyId)
                ->whereNull('deleted_at')
                ->count(),
            'out_of_stock'   => $outOfStock,
            'low_stock'      => $lowStock,
            'total_value'    => round($totalValue, 2),
        ];
    }

    /**
     * قائمة منتجات منخفضة أو نافدة المخزون
     */
    public function getLowStockProducts(?int $warehouseId = null): Collection
    {
        return collect(
            app(InventoryStockService::class)->getStockAt(now()->toDateString(), $warehouseId)
        )
            ->filter(fn ($r) => (float) $r['current_stock']
                <= max(0.0, (float) $r['min_stock_alert']))
            ->map(fn ($r) => (object) [
                'id'                 => $r['id'],
                'name'               => $r['name'],
                'ref'                => $r['ref'],
                'current_stock'      => (float) $r['current_stock'],
                'min_stock_alert'    => (float) $r['min_stock_alert'],
                'current_cost_price' => (float) $r['current_cost_price'],
                'family_name'        => $r['family']['name'] ?? null,
                'status'             => (float) $r['current_stock'] <= 0 ? 'out' : 'low',
            ])
            ->values();
    }
}
