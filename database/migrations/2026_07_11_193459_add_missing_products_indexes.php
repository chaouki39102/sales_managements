<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasIndex('products', 'products_company_id_name_active_index')) {
                $table->index(['company_id', 'name', 'active']);
            }
            if (!Schema::hasIndex('products', 'idx_products_lookup')) {
                $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            }
            if (!Schema::hasIndex('products', 'idx_products_filter')) {
                $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');
            }
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
