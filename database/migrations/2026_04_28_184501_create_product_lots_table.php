<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * جدول دفعات المنتجات — Lots  [نسخة جديدة مرتبطة بـ product_id مباشرة]
 *
 * ملاحظة: هذا الملف يستبدل 2025_10_15_093430_create_product_lots_table.php
 *         الذي كان مرتبطاً بـ product_id أيضاً لكنه محذوف ضمن redesign.
 *
 * الـ circular FK: stock_movement_id → stock_movements
 * يُضاف في migration منفصل (add_foreign_keys_new) لتجنب الدائرية.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();

            $table->string('lot_number', 50)->unique();

            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // تواريخ
            $table->date('manufacturing_date')->nullable()->index();
            $table->date('expiration_date')->nullable()->index();
            $table->date('purchase_date')->index();

            // أسعار وكميات
            $table->decimal('purchase_price', 15, 4);
            $table->decimal('legal_selling_price', 15, 4);
            $table->decimal('margin_percentage', 8, 4)->default(5.00);
            $table->decimal('original_quantity', 15, 4);
            $table->decimal('remaining_quantity', 15, 4)->index();

            // أعمدة محسوبة (مدعومة في MySQL/MariaDB)
            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')
                    ->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')
                    ->index();
                $table->decimal('total_cost', 15, 4)
                    ->storedAs('original_quantity * purchase_price');
                $table->decimal('remaining_value', 15, 4)
                    ->storedAs('remaining_quantity * purchase_price');
            } else {
                // SQLite: أعمدة عادية للتطوير والاختبار
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost', 15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            // الربط بحركة المخزون (FK يُضاف لاحقاً — circular dependency)
            $table->unsignedBigInteger('stock_movement_id')->nullable()
                ->comment('FK يُضاف لاحقاً في add_foreign_keys_new');

            $table->string('supplier_lot_number', 100)->nullable();
            $table->boolean('active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();

            // فهارس
            $table->index(
                ['product_id', 'warehouse_id', 'is_depleted', 'purchase_date'],
                'idx_fifo_lookup'
            );
            $table->index(['active', 'remaining_quantity'], 'idx_active_stock');
        });

        // قيود CHECK
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE product_lots
                ADD CONSTRAINT chk_quantities
                CHECK (remaining_quantity >= 0 AND remaining_quantity <= original_quantity)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_lots');
    }
};
