<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة company_id لكل الجداول الأساسية
 * + الـ Unique Constraints المركبة لبيئة Multi-Tenancy
 *
 * ملاحظة: fiscal_years تحتوي بالفعل على company_id من migration الإنشاء
 *         لذا لن تُعاد إضافتها هنا.
 *         employees لها company_id من migration الإنشاء أيضاً.
 *         settings لها company_id من migration الإنشاء أيضاً.
 */
return new class extends Migration
{
    private array $tables = [
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
        // 'fiscal_years',
        'payments',
        'expenses',
        'treasury_accounts',
        'opening_balances_stock',
        'opening_balances_parties',
        'numbering_series',
        'checks',
    ];

    public function up(): void
    {
        // ═══════════════════════════════════════════════
        // 1. إضافة company_id لكل الجداول
        // ═══════════════════════════════════════════════
        foreach ($this->tables as $tableName) {
            if (Schema::hasColumn($tableName, 'company_id')) {
                continue; // fiscal_years و employees و settings — تخطي
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->foreignId('company_id')
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $table->index('company_id', "idx_{$tableName}_company_id");
            });
        }

        // ═══════════════════════════════════════════════
        // 2. Composite Indexes للأداء
        // ═══════════════════════════════════════════════
        Schema::table('products', function (Blueprint $table) {
            $table->index(['company_id', 'active'],                   'idx_products_company_active');
            $table->index(['company_id', 'family_id', 'active'],      'idx_products_company_family_active');
        });

        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->index(['company_id', 'document_date'],                        'idx_docs_company_date');
            $table->index(['company_id', 'party_id', 'document_status_id'],       'idx_docs_company_party_status');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['company_id', 'product_id', 'movement_date'],   'idx_sm_company_product_date');
            $table->index(['company_id', 'warehouse_id', 'movement_date'], 'idx_sm_company_wh_date');
        });

        Schema::table('product_lots', function (Blueprint $table) {
            $table->index(['company_id', 'product_id', 'purchase_date'], 'idx_lots_company_product_date');
        });

        Schema::table('parties', function (Blueprint $table) {
            $table->index(['company_id', 'party_type_id', 'active'], 'idx_parties_company_type_active');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index(['company_id', 'payment_date', 'status'], 'idx_payments_company_date_status');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['company_id', 'date', 'status'], 'idx_expenses_company_date_status');
        });

        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->index(['company_id', 'active'], 'idx_ta_company_active');
        });

        // Schema::table('fiscal_years', function (Blueprint $table) {
        //     $table->index(['company_id', 'is_current'],            'idx_fy_company_current');
        //     $table->index(['company_id', 'start_date', 'end_date'], 'idx_fy_company_dates');
        // });

        // ═══════════════════════════════════════════════
        // 3. Unique Constraints المركبة — Multi-Tenancy
        // ═══════════════════════════════════════════════

        // warehouses
        Schema::table('warehouses', function (Blueprint $table) {
            $table->unique(['company_id', 'name'], 'warehouses_company_name_unique');
            $table->unique(['company_id', 'code'], 'warehouses_company_code_unique');
        });

        // parties
        Schema::table('parties', function (Blueprint $table) {
            $table->unique(['company_id', 'nif'],   'parties_company_nif_unique');
            $table->unique(['company_id', 'email'], 'parties_company_email_unique');
        });

        // treasury_accounts
        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->unique(['company_id', 'code'], 'treasury_accounts_company_code_unique');
        });

        // checks
        Schema::table('checks', function (Blueprint $table) {
            $table->unique(['company_id', 'check_number'], 'checks_company_number_unique');
        });

        // product_lots
        Schema::table('product_lots', function (Blueprint $table) {
            $table->unique(['company_id', 'lot_number'], 'product_lots_company_lot_unique');
        });

        // numbering_series — الـ unique الصحيح يشمل company_id
        Schema::table('numbering_series', function (Blueprint $table) {
            $table->unique(
                ['company_id', 'document_type_id', 'warehouse_id', 'prefix'],
                'numbering_series_company_unique'
            );
        });

        // product_packagings — barcode فريد داخل الشركة
        Schema::table('product_packagings', function (Blueprint $table) {
            $table->unique(['company_id', 'barcode'], 'packagings_company_barcode_unique');
        });
    }

    public function down(): void
    {
        // حذف الـ Unique Constraints أولاً
        Schema::table('product_packagings', fn ($t) => $t->dropUnique('packagings_company_barcode_unique'));
        Schema::table('numbering_series',   fn ($t) => $t->dropUnique('numbering_series_company_unique'));
        Schema::table('product_lots',       fn ($t) => $t->dropUnique('product_lots_company_lot_unique'));
        Schema::table('checks',             fn ($t) => $t->dropUnique('checks_company_number_unique'));
        Schema::table('treasury_accounts',  fn ($t) => $t->dropUnique('treasury_accounts_company_code_unique'));
        Schema::table('parties',            function ($t) {
            $t->dropUnique('parties_company_nif_unique');
            $t->dropUnique('parties_company_email_unique');
        });
        Schema::table('warehouses', function ($t) {
            $t->dropUnique('warehouses_company_name_unique');
            $t->dropUnique('warehouses_company_code_unique');
        });

        // حذف company_id
        foreach ($this->tables as $tableName) {
            if (!Schema::hasColumn($tableName, 'company_id')) {
                continue;
            }
            // fiscal_years و employees و settings — لها company_id من الإنشاء، لا نحذفها هنا
            if (in_array($tableName, ['fiscal_years', 'employees', 'settings'])) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['company_id']);
                $table->dropColumn('company_id');
            });
        }
    }
};
