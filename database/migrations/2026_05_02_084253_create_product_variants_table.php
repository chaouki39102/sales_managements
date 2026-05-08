<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 50)->nullable();
            $table->enum('price_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('price_value', 15, 4)->nullable();
            $table->decimal('stock', 15, 4)->nullable();
            $table->boolean('track_stock')->nullable();
            $table->json('attributes')->nullable();
            $table->string('image')->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('volume', 10, 2)->nullable();
            $table->boolean('active')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sku'], 'pv_company_sku_unique');
            $table->unique(['company_id', 'barcode'], 'pv_company_barcode_unique');
            $table->index(['company_id', 'product_id', 'active']);
            $table->index(['company_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_variants');
    }
};
