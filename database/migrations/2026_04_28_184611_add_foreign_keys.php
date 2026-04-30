<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة المفاتيح الأجنبية الدائرية (Circular Foreign Keys)  [نسخة مصححة]
 *
 * هذا الملف يستبدل 2025_10_23_135226_add_foreing_keys.php الذي كان يشير
 * إلى جداول محذوفة (products, product_lots القديم).
 *
 * يجب تنفيذه بعد إنشاء كل الجداول التالية:
 *   - commercial_document_lines  (بعد fix_commercial_document_lines)
 *   - stock_movements            (النسخة الجديدة مرتبطة بـ product_id)
 *   - product_lots               (النسخة الجديدة)
 *
 * الدائريات الثلاث:
 *   1. commercial_document_lines.stock_lot_id   → product_lots
 *   2. stock_movements.commercial_document_line_id → commercial_document_lines
 *   3. stock_movements.stock_lot_id             → product_lots
 *   4. product_lots.stock_movement_id           → stock_movements
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. ربط stock_lot_id في commercial_document_lines → product_lots
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('stock_lot_id')
                ->references('id')
                ->on('product_lots')
                ->restrictOnDelete()   // لا تحذف الـ lot إذا كان في سطر وثيقة
                ->cascadeOnUpdate();
        });

        // 2. ربط commercial_document_line_id في stock_movements → commercial_document_lines
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreign('commercial_document_line_id')
                ->references('id')
                ->on('commercial_document_lines')
                ->nullOnDelete()       // اجعل الحركة بلا وثيقة إذا حُذف السطر
                ->cascadeOnUpdate();

            // 3. ربط stock_lot_id في stock_movements → product_lots
            $table->foreign('stock_lot_id')
                ->references('id')
                ->on('product_lots')
                ->restrictOnDelete()   // لا تحذف الـ lot إذا كان له حركة
                ->cascadeOnUpdate();
        });

        // 4. ربط stock_movement_id في product_lots → stock_movements
        Schema::table('product_lots', function (Blueprint $table) {
            $table->foreign('stock_movement_id')
                ->references('id')
                ->on('stock_movements')
                ->nullOnDelete()       // اجعل الـ lot بلا حركة إذا حُذفت الحركة
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropForeign(['stock_lot_id']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['commercial_document_line_id']);
            $table->dropForeign(['stock_lot_id']);
        });

        Schema::table('product_lots', function (Blueprint $table) {
            $table->dropForeign(['stock_movement_id']);
        });
    }
};
