<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();

            // المفاتيح الأجنبية (إجبارية للربط)
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            // حقول اختيارية (كلها nullable)
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

            // حقول المراجعة
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');

            $table->timestamps();
            $table->softDeletes();

            // القيود الفريدة المركبة (ضمن نطاق الشركة)
            $table->unique(['company_id', 'sku'], 'pv_company_sku_unique');
            $table->unique(['company_id', 'barcode'], 'pv_company_barcode_unique');

            // فهارس الأداء
            $table->index(['product_id', 'active']);
            $table->index(['company_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
