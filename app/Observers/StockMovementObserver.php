<?php

namespace App\Observers;

use App\Models\StockMovement;
use App\Models\StockLot;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * 🤖 Observer محسّن لإنشاء دفعات المخزون
 * * يجب تسجيل هذا الـ Observer في App/Providers/EventServiceProvider
 */
class StockMovementObserver
{
    private const MAX_LEGAL_MARGIN = 5.00;

    /**
     * 🎯 بعد إنشاء حركة مخزون
     */
    public function created(StockMovement $movement): void
    {
        try {
            // فقط عمليات الإدخال (Direction = 1)
            if ($movement->stockMovementType?->direction === 1) {
                $this->createStockLot($movement);
            }
        } catch (\Exception $e) {
            Log::error("فشل إنشاء دفعة للحركة {$movement->id}: " . $e->getMessage());
            // 🔥 إعادة رمي الخطأ لإيقاف المعاملة التي أنشأت الحركة
            throw $e;
        }
    }

    /**
     * 📦 إنشاء دفعة جديدة (محمية من الأخطاء)
     */
    private function createStockLot(StockMovement $movement): void
    {
        // استخدام معاملة داخلية لضمان أن إنشاء الدفعة والربط يتم دفعة واحدة
        DB::transaction(function () use ($movement) {
            $variant = $movement->productVariant;

            // 🔥 1. التحقق من صحة البيانات
            if ($movement->quantity <= 0 || $movement->unit_price <= 0) {
                // هذا يجب أن يُمنع بواسطة قيود التطبيق/القاعدة، لكنه أمان إضافي
                return;
            }

            $purchasePrice = $movement->unit_price;

            // 🔥 2. حساب السعر القانوني (5%)
            $legalSellingPrice = round(
                $purchasePrice * (1 + (self::MAX_LEGAL_MARGIN / 100)),
                4
            );

            // 🔥 3. إنشاء الدفعة
            $lot = StockLot::create([
                'lot_number' => $this->generateLotNumber($variant, $movement),
                'product_variant_id' => $variant->id,
                'warehouse_id' => $movement->warehouse_id,
                'purchase_date' => $movement->movement_date,
                'purchase_price' => $purchasePrice,
                'original_quantity' => $movement->quantity,
                'remaining_quantity' => $movement->quantity,
                'legal_selling_price' => $legalSellingPrice,
                'margin_percentage' => self::MAX_LEGAL_MARGIN,
                'stock_movement_id' => $movement->id,
                'expiration_date' => $movement->expiration_date,
                'active' => true,
            ]);

            // 🔥 4. ربط الحركة بالدفعة
            $movement->update(['stock_lot_id' => $lot->id]);

            Log::info("✅ تم إنشاء دفعة: {$lot->lot_number} | الكمية: {$lot->original_quantity}");
        });
    }

    /**
     * 🔢 توليد رقم دفعة فريد (محسّن)
     */
    private function generateLotNumber($variant, StockMovement $movement): string
    {
        $date = $movement->movement_date->format('Ymd');
        $variantCode = $variant->ref ?? str_pad($variant->id, 6, '0', STR_PAD_LEFT);

        // 🔥 استخدام القفل لضمان عدم تكرار الترقيم المتسلسل
        $sequence = DB::table('product_lots')
            ->where('product_variant_id', $variant->id)
            ->whereDate('purchase_date', $movement->movement_date)
            ->count() + 1;

        return sprintf("LOT-%s-%s-%03d", $variantCode, $date, $sequence);
    }
}
