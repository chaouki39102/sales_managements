<?php
// app/Services/InventoryReportService.php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class InventoryReportService
{
    /**
     * تقرير حركات المخزون مع Pivot حسب العائلات والعلامات التجارية
     */
    public function getMovementsPivotReport(string $fromDate, string $toDate, ?array $familyIds = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->leftJoin('brands as b', 'b.id', '=', 'p.brand_id')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
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

        return $query->groupBy('f.name', 'b.name')
            ->orderBy('family_name')
            ->orderBy('brand_name')
            ->get()
            ->map(function ($item) {
                $item->total_in_qty = (float) $item->total_in_qty;
                $item->total_out_qty = (float) $item->total_out_qty;
                $item->total_in_value = (float) $item->total_in_value;
                $item->total_out_value = (float) $item->total_out_value;
                return $item;
            });
    }

    /**
     * تقرير تفصيلي لحركات منتج معين
     */
    public function getProductMovementsDetail(int $productId, int $warehouseId, string $fromDate, string $toDate): Collection
    {
        return DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->leftJoin('commercial_document_lines as cdl', 'cdl.id', '=', 'sm.commercial_document_line_id')
            ->leftJoin('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->where('sm.product_id', $productId)
            ->where('sm.warehouse_id', $warehouseId)
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'sm.movement_date',
                'smt.label as movement_type',
                'smt.direction',
                'sm.quantity',
                'sm.unit_price',
                'sm.total_price',
                'sm.lot_number',
                'cd.document_number',
                'cd.document_date'
            )
            ->orderBy('sm.movement_date')
            ->get();
    }

    /**
     * تقرير المخزون الحالي مع Pivot حسب العائلات
     */
    public function getCurrentStockPivotReport(?int $warehouseId = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->where('sm.is_validated', true);

        if ($warehouseId) {
            $query->where('sm.warehouse_id', $warehouseId);
        }

        // الحصول على آخر رصيد لكل منتج
        $subQuery = DB::table('stock_movements as sm2')
            ->select('sm2.product_id', 'sm2.warehouse_id', 'sm2.stock_balance_after')
            ->whereIn('sm2.id', function ($q) {
                $q->select(DB::raw('MAX(id)'))
                    ->from('stock_movements')
                    ->groupBy('product_id', 'warehouse_id');
            });

        return DB::query()
            ->fromSub($subQuery, 'last_movements')
            ->join('products as p', 'p.id', '=', 'last_movements.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->select(
                'f.name as family_name',
                DB::raw('COUNT(DISTINCT p.id) as products_count'),
                DB::raw('SUM(last_movements.stock_balance_after) as total_quantity'),
                DB::raw('SUM(last_movements.stock_balance_after * p.current_cost_price) as total_value')
            )
            ->groupBy('f.name')
            ->orderBy('family_name')
            ->get();
    }
}
