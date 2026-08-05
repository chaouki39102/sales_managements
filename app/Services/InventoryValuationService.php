<?php
// app/Services/InventoryValuationService.php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\ProductLot;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;

class InventoryValuationService
{
    /**
     * تحديث تكلفة المخزون بعد حركة شراء (إدخال)
     */
    public function updateCostAfterPurchase(StockMovement $movement): void
    {
        $product = $movement->product;

        if (!$product->valuationMethod) {
            return; // لا توجد طريقة تقييم محددة
        }

        if ($product->valuationMethod->method === 'weighted_average') {
            $this->updateWeightedAverage($product, $movement->warehouse_id);
        }
        // FIFO لا يحتاج تحديث تلقائي
    }

    /**
     * تحديث المتوسط المرجح (PMP) للمنتج في مستودع معين
     */
    private function updateWeightedAverage(Product $product, int $warehouseId): void
    {
        $result = DB::table('stock_movements')
            ->join('stock_movement_types', function ($join) {
                $join->on('stock_movement_types.id', '=', 'stock_movements.stock_movement_type_id')
                     ->on('stock_movement_types.company_id', '=', 'stock_movements.company_id');
            })
            ->where('stock_movements.company_id', $product->company_id)
            ->where('stock_movements.product_id', $product->id)
            ->where('stock_movements.warehouse_id', $warehouseId)
            ->where('stock_movements.is_validated', true)
            ->whereNull('stock_movements.deleted_at')
            ->selectRaw('
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity * unit_price ELSE 0 END) as total_value_in,
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity ELSE 0 END) as total_qty_in,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity * cost_price ELSE 0 END) as total_value_out,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity ELSE 0 END) as total_qty_out
            ')
            ->first();

        if ($result && $result->total_qty_in > 0) {
            $currentStockQty = $result->total_qty_in - ($result->total_qty_out ?? 0);
            $currentStockValue = $result->total_value_in - ($result->total_value_out ?? 0);

            if ($currentStockQty > 0) {
                $pmp = $currentStockValue / $currentStockQty;
                $product->update(['current_cost_price' => round($pmp, 4)]);
            }
        }
    }

    /**
     * حساب تكلفة حركة خروج (مبيعات) بناءً على طريقة التقييم
     */
    public function getCostPriceForSale(Product $product, int $warehouseId, float $quantity): float
    {
        if (!$product->valuationMethod) {
            return (float) $product->purchase_price_ht;
        }

        switch ($product->valuationMethod->method) {
            case 'weighted_average':
                return $product->current_cost_price ?? (float) $product->purchase_price_ht;

            case 'fifo':
                return $this->getFIFOCost($product, $warehouseId, $quantity);

            case 'lifo':
                return $this->getLIFOCost($product, $warehouseId, $quantity);

            default:
                return (float) $product->purchase_price_ht;
        }
    }

    /**
     * حساب تكلفة FIFO (First In, First Out)
     */
    private function getFIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;
        $usedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;

            $usedLots[] = [
                'lot' => $lot,
                'quantity' => $qtyFromLot
            ];
        }

        if ($remainingQty > 0) {
            // الكمية المطلوبة أكبر من المخزون المتاح
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * حساب تكلفة LIFO (Last In, First Out)
     */
    private function getLIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;
        }

        if ($remainingQty > 0) {
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * تحديث أرصدة الدفعات بعد حركة خروج (FIFO/LIFO)
     */
    public function updateLotBalancesAfterSale(Product $product, int $warehouseId, float $quantity, string $method = 'fifo'): array
    {
        $orderDirection = $method === 'fifo' ? 'asc' : 'desc';

        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', $orderDirection)
            ->orderBy('id', $orderDirection)
            ->get();

        $remainingQty = $quantity;
        $updatedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $newRemaining = $lot->remaining_quantity - $qtyFromLot;

            $lot->update([
                'remaining_quantity' => $newRemaining,
                'is_depleted' => $newRemaining <= 0
            ]);

            $updatedLots[] = [
                'lot_id' => $lot->id,
                'quantity_used' => $qtyFromLot,
                'remaining' => $newRemaining
            ];

            $remainingQty -= $qtyFromLot;
        }

        return $updatedLots;
    }
}
