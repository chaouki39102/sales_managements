<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'users',
            'products',
            'product_packagings',
            'product_prices',
            'quantity_discounts',
            'product_lots',
            'stock_movements',
            'commercial_documents',
            'commercial_document_lines',
            'parties',
            'warehouses',
            'fiscal_years',
            'payments',
            'expenses',
            'treasury_accounts',
            'opening_balances_stock',
            'opening_balances_parties',
            'numbering_series',
            'checks',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                // إضافة العمود فقط إذا لم يكن موجوداً
                if (!Schema::hasColumn($tableName, 'company_id')) {
                    $table->foreignId('company_id')->after('id')
                          ->constrained('companies')
                          ->cascadeOnDelete();
                }
                // إضافة فهرس منفرد
                $table->index('company_id');
            });
        }

        // فهارس مركبة لتحسين الاستعلامات الشائعة
        Schema::table('products', function (Blueprint $table) {
            $table->index(['company_id', 'active']);
            $table->index(['company_id', 'family_id', 'active']);
        });

        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->index(['company_id', 'document_date']);
            $table->index(['company_id', 'party_id', 'document_status_id']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['company_id', 'product_id', 'movement_date']);
            $table->index(['company_id', 'warehouse_id', 'movement_date']);
        });

        Schema::table('product_lots', function (Blueprint $table) {
            $table->index(['company_id', 'product_id', 'purchase_date']);
        });
    }

    public function down(): void
    {
        $tables = [
            'users', 'products', 'product_packagings', 'product_prices',
            'quantity_discounts', 'product_lots', 'stock_movements',
            'commercial_documents', 'commercial_document_lines', 'parties',
            'warehouses', 'fiscal_years', 'payments', 'expenses',
            'treasury_accounts', 'opening_balances_stock', 'opening_balances_parties',
            'numbering_series', 'checks'
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign(['company_id']);
                $table->dropColumn('company_id');
            });
        }
    }
};
