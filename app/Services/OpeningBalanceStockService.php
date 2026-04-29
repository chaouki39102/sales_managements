<?php

namespace App\Services;

use App\Models\OpeningBalanceStock;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\FiscalYear;
use App\Models\StockMovement;
use App\Models\StockMovementType;
use Illuminate\Support\Facades\DB;

class OpeningBalanceStockService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceStock::class;
    protected string $resourceName = 'opening_balance_stock';
    protected array $defaultWith = ['fiscalYear', 'productVariant', 'warehouse'];

      /**
     * إنشاء رصيد افتتاحي لمنتج (بدون دفعة)
     */
    public function createOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        float $quantity,
        float $unitPrice
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $quantity, $unitPrice) {
            // حفظ الرصيد الافتتاحي
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => null,
                'manufacturing_date' => null,
                'expiration_date' => null,
            ]);

            // إنشاء حركة مخزون افتتاحية
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }

    /**
     * إنشاء رصيد افتتاحي لدفعة محددة
     */
    public function createLotOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        array $lotData
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $lotData) {
            $quantity = $lotData['quantity'];
            $unitPrice = $lotData['unit_price'];

            // حفظ الرصيد الافتتاحي للدفعة
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => $lotData['lot_number'],
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
            ]);

            // إنشاء دفعة جديدة
            $lot = $product->lots()->create([
                'lot_number' => $lotData['lot_number'],
                'warehouse_id' => $warehouse->id,
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
                'purchase_date' => $fiscalYear->start_date,
                'purchase_price' => $unitPrice,
                'legal_selling_price' => $lotData['selling_price'] ?? 0,
                'original_quantity' => $quantity,
                'remaining_quantity' => $quantity,
                'active' => true,
            ]);

            // إنشاء حركة مخزون افتتاحية للدفعة
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'lot_number' => $lotData['lot_number'],
                'stock_lot_id' => $lot->id,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }
}
