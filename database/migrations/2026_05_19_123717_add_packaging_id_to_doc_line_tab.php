<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // migration جديد
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreignId('packaging_id')
                ->nullable()
                ->after('product_id')
                ->constrained('product_packagings')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doc_line_tab', function (Blueprint $table) {
            //
        });
    }
};
