<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for numbering_series table
 *
 * Manages automatic numbering sequences for documents
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('numbering_series', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Kept cascadeOnDelete (correct choice) and added cascadeOnUpdate
            $table->foreignId('document_type_id')
                  ->constrained('document_types')
                  ->cascadeOnDelete() // (صحيح) حذف السلسلة إذا حذف نوع المستند
                  ->cascadeOnUpdate()
                  ->name('fk_series_document_type_id');

            // ✅ CORRECTED: Changed cascadeOnDelete to nullOnDelete (field is nullable)
            $table->foreignId('warehouse_id')
                  ->nullable()
                  ->constrained('warehouses')
                  ->nullOnDelete() // (مُصحح) اجعل الحقل NULL إذا حذف المستودع
                  ->cascadeOnUpdate()
                  ->name('fk_series_warehouse_id');

            $table->string('prefix', 20);
            $table->string('suffix', 20)->nullable();
            $table->string('format', 100)->comment('e.g., {PREFIX}{YY}{MONTH}{NUMBER:6}');
            $table->unsignedBigInteger('last_number')->default(0);
            $table->unsignedInteger('padding')->default(6)->comment('Number padding length');

            // ✅ IMPROVEMENT: Added new fields for better control
            $table->unsignedBigInteger('start_number')->default(1)->comment('The number to start from');
            $table->unsignedBigInteger('max_number')->nullable()->comment('The maximum allowed number in the series');
            $table->boolean('reset_yearly')->default(false);
            $table->boolean('reset_monthly')->default(false);
            $table->unsignedSmallInteger('current_year')->nullable();
            $table->unsignedTinyInteger('current_month')->nullable();
            $table->date('reset_date')->nullable()->comment('Specific date for manual reset if needed');
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_locked')->default(false)->index()->comment('Prevent this series from being used');
            $table->timestamps();

            $table->unique(['document_type_id', 'warehouse_id', 'prefix'], 'numbering_series_unique');
        });

        // ✅ IMPROVEMENT: Added table comment
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE numbering_series COMMENT 'يدير سلاسل الترقيم التلقائي للمستندات المختلفة'");
    }
    }

    public function down(): void
    {
        Schema::dropIfExists('numbering_series');
    }
};
