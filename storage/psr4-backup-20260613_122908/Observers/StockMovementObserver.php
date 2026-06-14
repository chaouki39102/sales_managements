<?php
// app/Observers/StockMovementObserver.php

namespace App\Observers;

use App\Models\StockMovement;
use App\Models\ProductLot;
use App\Services\InventoryValuationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockMovementObserver
{
    protected InventoryValuationService $valuationService;
    private const MAX_LEGAL_MARGIN = 5.00; // هامش الربح القانوني 5%

    public function __construct(InventoryValuationService $valuationService)
    {
        $this->valuationService = $valuationService;
    }

    /**
     * قبل إنشاء الحركة: حساب سعر التكلفة للحركات الخارجة
     */
    public function creating(StockMovement $movement): void
    {
        if (!$movement->stockMovementType) return;

        // حركات الخروج (مبيعات)
        // حركات الخروج (مبيعات): نحسب cost_price فقط — لا نلمس unit_price
if ($movement->stockMovementType->direction < 0) {
    $movement->cost_price = $this->valuationService->getCostPriceForSale(
        $movement->product,
        $movement->warehouse_id,
        $movement->quantity
    );
    // unit_price يبقى كما أرسله الـ Service (سعر البيع للعميل)
    $movement->total_price = $movement->quantity * $movement->unit_price;
}

        // حركات الإدخال (شراء): نضمن unit_price = cost_price
        if ($movement->stockMovementType->direction > 0) {
            $movement->cost_price = $movement->unit_price;
            $movement->total_price = $movement->quantity * $movement->unit_price;
        }
    }

    /**
     * بعد إنشاء الحركة: تحديث التكلفة، إنشاء الدفعات، إدارة الأرصدة
     */
    public function created(StockMovement $movement): void
    {
        try {
            DB::transaction(function () use ($movement) {
                // ✅ نتأكد من تحميل الـ relationship قبل الاستخدام
                $movement->loadMissing('stockMovementType', 'product');

                if (!$movement->stockMovementType) return;

                // 1. تحديث PMP لحركات الإدخال
                if ($movement->stockMovementType->direction > 0) {
                    $this->valuationService->updateCostAfterPurchase($movement);
                }

                // 2. إنشاء دفعة جديدة (لحركات الإدخال فقط)
                if ($movement->stockMovementType->direction > 0) {
                    $this->createProductLot($movement);
                }

                // 3. تحديث أرصدة الدفعات لحركات الخروج (FIFO/LIFO)
                if ($movement->stockMovementType->direction < 0) {
                    $method = $movement->product->valuationMethod->method ?? 'weighted_average';
                    if (in_array($method, ['fifo', 'lifo'])) {
                        $this->valuationService->updateLotBalancesAfterSale(
                            $movement->product,
                            $movement->warehouse_id,
                            $movement->quantity,
                            $method
                        );
                    }
                }

                // 4. تحديث حقل stock_balance_after
                $this->updateStockBalanceAfter($movement);
            });
        } catch (\Exception $e) {
            Log::error("خطأ في Observer حركة المخزون {$movement->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * إنشاء دفعة (Lot) لحركة الإدخال
     */
    private function createProductLot(StockMovement $movement): void
    {
        $product = $movement->product;
        $purchasePrice = $movement->unit_price;

        // حساب السعر القانوني (سعر البيع الأدنى = سعر الشراء + 5%)
        $legalSellingPrice = round($purchasePrice * (1 + self::MAX_LEGAL_MARGIN / 100), 4);

        // توليد رقم دفعة فريد
        $lotNumber = $this->generateLotNumber($product, $movement);

        $lot = ProductLot::create([
            'lot_number' => $lotNumber,
            'product_id' => $product->id,
            'warehouse_id' => $movement->warehouse_id,
            'purchase_date' => $movement->movement_date,
            'purchase_price' => $purchasePrice,
            'legal_selling_price' => $legalSellingPrice,
            'margin_percentage' => self::MAX_LEGAL_MARGIN,
            'original_quantity' => $movement->quantity,
            'remaining_quantity' => $movement->quantity,
            'stock_movement_id' => $movement->id,
            'expiration_date' => $movement->expiration_date ?? null,
            'active' => true,
        ]);

        // ربط الحركة بالدفعة
        $movement->updateQuietly(['stock_lot_id' => $lot->id]);


        Log::info("✅ تم إنشاء دفعة: {$lot->lot_number} للمنتج {$product->name}");
    }

    /**
     * توليد رقم دفعة فريد
     */
    private function generateLotNumber($product, StockMovement $movement): string
    {
        $date = $movement->movement_date->format('Ymd');
        $productCode = $product->ref ?? str_pad($product->id, 6, '0', STR_PAD_LEFT);

        $sequence = ProductLot::where('product_id', $product->id)
            ->whereDate('purchase_date', $movement->movement_date)
            ->count() + 1;

        return sprintf("LOT-%s-%s-%03d", $productCode, $date, $sequence);
    }

    /**
     * تحديث رصيد المخزون بعد الحركة (بالتتابع)
     */
    private function updateStockBalanceAfter(StockMovement $movement): void
    {
        $direction = $movement->stockMovementType->direction;
        $quantityImpact = $direction * $movement->quantity;

        // حساب الرصيد السابق
        $previousBalance = StockMovement::where('product_id', $movement->product_id)
            ->where('warehouse_id', $movement->warehouse_id)
            ->where('id', '<', $movement->id)
            ->orderBy('id', 'desc')
            ->value('stock_balance_after') ?? 0;

        $newBalance = max(0, $previousBalance + $quantityImpact);
        $movement->stock_balance_after = $newBalance;
        $movement->saveQuietly();
    }
}
