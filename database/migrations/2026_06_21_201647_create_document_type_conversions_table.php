<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_type_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('source_code', 10)->comment('Source document type code (e.g., DEV)');
            $table->string('target_code', 10)->comment('Allowed target document type code (e.g., BCC)');
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'source_code', 'target_code'], 'uk_source_target');
            $table->index(['company_id', 'source_code'], 'idx_source');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE document_type_conversions COMMENT 'جدول يحدد أنواع المستندات المسموح التحويل بينها'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_type_conversions');
    }
};
