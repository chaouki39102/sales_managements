<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول الأرصدة الافتتاحية للمخزون - Opening Balances Stock
 * تم التعديل للربط المباشر بـ product_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_balances_stock', function (Blueprint $table) {
            $table->id();

            // الربط بالسنة المالية
            $table->foreignId('fiscal_year_id')
                ->constrained('fiscal_years')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // الربط بالمنتج مباشرة (بديل لـ product_variant_id)
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // الربط بالمستودع
            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // بيانات الرصيد
            $table->decimal('opening_quantity', 15, 3)->default(0);
            $table->decimal('opening_value', 15, 4)
                ->comment('القيمة الإجمالية للمخزون الافتتاحي (PMP) عند بداية السنة');

            $table->timestamps();

            // --- القيود والفهارس ---

            // ضمان عدم تكرار الرصيد الافتتاحي لنفس المنتج في نفس المستودع خلال نفس السنة المالية
            $table->unique(
                ['fiscal_year_id', 'product_id', 'warehouse_id'],
                'obs_year_product_wh_unique'
            );

            // فهرس لتحسين سرعة التقارير المخزنية
            $table->index(['product_id', 'warehouse_id'], 'idx_obs_product_warehouse');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balances_stock');
    }
};
