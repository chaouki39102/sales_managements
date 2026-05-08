<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('packaging_id')->nullable()->constrained('product_packagings')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('stock_movement_type_id')->constrained('stock_movement_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('commercial_document_line_id')->nullable()->comment('FK يُضاف لاحقاً');
            $table->dateTime('movement_date');
            $table->decimal('quantity', 15, 4)->comment('الكمية بالوحدة الأساسية');
            $table->decimal('packaging_quantity', 15, 4)->nullable()->comment('الكمية بوحدة التعبئة — للعرض فقط');
            $table->decimal('unit_price', 15, 4)->comment('سعر الوحدة الأساسية وقت الحركة');
            $table->decimal('cost_price', 15, 4)->comment('سعر التكلفة (PMP أو FIFO) وقت الحركة');
            $table->decimal('total_price', 15, 4);
            $table->string('price_source', 30)->default('sale')->comment('purchase=شراء | sale=بيع | adjustment=تسوية');
            $table->decimal('stock_balance_after', 15, 4)->comment('الرصيد بالوحدة الأساسية بعد الحركة');
            $table->string('lot_number', 100)->nullable();
            $table->date('expiration_date')->nullable();
            $table->unsignedBigInteger('stock_lot_id')->nullable()->index()->comment('FK يُضاف لاحقاً');
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('parent_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('is_validated')->default(false)->index();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'product_id', 'warehouse_id', 'movement_date'], 'stock_mov_prod_wh_date_idx');
            $table->index(['company_id', 'movement_date', 'stock_movement_type_id']);
            $table->index(['company_id', 'warehouse_id', 'movement_date']);
            $table->index(['company_id', 'fiscal_year_id', 'movement_date']);
            $table->index('lot_number');
        });
    }
    public function down(): void {
        Schema::dropIfExists('stock_movements');
    }
};
