<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreignId('quantity_discount_id')->nullable()
                ->after('discount_percentage')
                ->constrained('quantity_discounts')->nullOnDelete()
                ->comment('Which quantity-discount tier (if any) determined this line discount_percentage — audit trail only, never used to re-derive the percentage later');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quantity_discount_id');
        });
    }
};
