<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('numbering_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->cascadeOnDelete()->cascadeOnUpdate()->name('fk_series_document_type_id');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete()->cascadeOnUpdate()->name('fk_series_warehouse_id');
            $table->string('prefix', 20);
            $table->string('suffix', 20)->nullable();
            $table->string('format', 100)->comment('{PREFIX}{YY}{MONTH}{NUMBER:6}');
            $table->unsignedBigInteger('last_number')->default(0);
            $table->unsignedInteger('padding')->default(6);
            $table->unsignedBigInteger('start_number')->default(1);
            $table->unsignedBigInteger('max_number')->nullable();
            $table->boolean('reset_yearly')->default(false);
            $table->boolean('reset_monthly')->default(false);
            $table->unsignedSmallInteger('current_year')->nullable();
            $table->unsignedTinyInteger('current_month')->nullable();
            $table->date('reset_date')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_locked')->default(false)->index();
            $table->timestamps();

            $table->unique(['company_id', 'document_type_id', 'warehouse_id', 'prefix'], 'numbering_series_company_unique');
            $table->index(['document_type_id', 'warehouse_id', 'prefix'], 'idx_series_lookup');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE numbering_series COMMENT 'يدير سلاسل الترقيم التلقائي للمستندات المختلفة'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('numbering_series');
    }
};
