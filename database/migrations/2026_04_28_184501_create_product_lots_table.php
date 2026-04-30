<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();

            // ✅ lot_number: index فقط — الـ unique المركب مع company_id يأتي لاحقاً
            $table->string('lot_number', 50)->index();

            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->date('manufacturing_date')->nullable()->index();
            $table->date('expiration_date')->nullable()->index();
            $table->date('purchase_date')->index();

            $table->decimal('purchase_price',      15, 4);
            $table->decimal('legal_selling_price', 15, 4);
            $table->decimal('margin_percentage',    8, 4)->default(5.00);
            $table->decimal('original_quantity',   15, 4);
            $table->decimal('remaining_quantity',  15, 4)->index();

            // أعمدة محسوبة — MySQL/MariaDB فقط
            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')
                    ->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')
                    ->index();
                $table->decimal('total_cost', 15, 4)
                    ->storedAs('original_quantity * purchase_price');
                $table->decimal('remaining_value', 15, 4)
                    ->storedAs('remaining_quantity * purchase_price');
            } else {
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost',      15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            // FK دائري — يُضاف في migration منفصل
            $table->unsignedBigInteger('stock_movement_id')->nullable()
                ->comment('FK يُضاف لاحقاً — circular dependency');

            $table->string('supplier_lot_number', 100)->nullable();
            $table->boolean('active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();

            $table->index(
                ['product_id', 'warehouse_id', 'is_depleted', 'purchase_date'],
                'idx_fifo_lookup'
            );
            $table->index(['active', 'remaining_quantity'], 'idx_active_stock');
        });

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
