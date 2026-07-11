<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Restore missing indexes from original migration (lost during dev table recreations)
            // Note: (company_id, active) is redundant with idx_products_list_sort(company_id, active, created_at)
            $table->index(['company_id', 'name', 'active']);
            $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'name', 'active']);
            $table->dropIndex('idx_products_lookup');
            $table->dropIndex('idx_products_filter');
        });
    }
};
