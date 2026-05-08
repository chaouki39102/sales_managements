<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('opening_balances_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('opening_quantity', 15, 3)->default(0);
            $table->decimal('opening_value', 15, 4)->comment('القيمة الإجمالية للمخزون الافتتاحي (PMP) عند بداية السنة');
            $table->string('lot_number', 100)->nullable();
            $table->date('manufacturing_date')->nullable();
            $table->date('expiration_date')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'], 'obs_year_product_wh_unique');
            $table->index(['company_id', 'product_id', 'warehouse_id'], 'idx_obs_product_warehouse');
        });
    }
    public function down(): void {
        Schema::dropIfExists('opening_balances_stock');
    }
};
