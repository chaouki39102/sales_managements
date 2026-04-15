<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * (جدول جديد)
 * إنشاء جدول الأرصدة الافتتاحية للمخزون
 * لتسجيل رصيد المخزون في بداية كل سنة مالية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_balances_stock', function (Blueprint $table) {
            $table->id();

            // الربط بالسنة المالية (يحذف الرصيد إذا حذفت السنة)
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();

            // الربط بالصنف (يمنع حذف صنف له رصيد افتتاحي)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();

            // الربط بالمستودع (يمنع حذف مستودع له رصيد افتتاحي)
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();

            $table->decimal('opening_quantity', 15, 3);
            $table->decimal('opening_value', 15, 4)->comment('القيمة الإجمالية للمخزون الافتتاحي (PMP)');

            $table->timestamps();

            // ضمان عدم تكرار الصنف في نفس المستودع والسنة
            $table->unique(['fiscal_year_id', 'product_variant_id', 'warehouse_id'], 'opening_stock_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balances_stock');
    }
};
