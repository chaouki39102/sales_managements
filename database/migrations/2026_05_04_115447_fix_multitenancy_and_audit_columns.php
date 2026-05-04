<?php

// ════════════════════════════════════════════════════════════════════════
// 2026_05_04_000001_fix_multitenancy_and_audit_columns.php
//
// Migration إصلاحي شامل لمشاكل الـ Multi-Tenancy و BaseService
//
// يعالج 3 فئات من المشاكل:
//
// ① جداول Tenant تفتقد company_id (لم تُضَف في add_company_id migration)
//    → brands, expense_categories, families, employment_contracts,
//      payment_modes, price_levels, exchange_rates,
//      document_payment, product_prices, quantity_discounts
//
// ② جداول tenant لديها company_id لكن تفتقد created_by/updated_by
//    → يسبب خطأ SQL عند استخدام BaseService.prepareDataForUpdate
//    → attachments, fiscal_years, notifications, numbering_series,
//      product_lots, product_packagings, settings,
//      checks, stock_movements, barcodes
//
// ③ جدول companies يفتقد updated_by (تم اكتشافه في الجلسة السابقة)
//    → سبب الخطأ: SQLSTATE[HY000]: no such column: updated_by
// ════════════════════════════════════════════════════════════════════════

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // ── ① جداول تحتاج company_id (tenant tables بدون عزل) ─────────────
    private array $needsCompanyId = [
        'brands',
        'families',
        'expense_categories',
        'price_levels',
        'payment_modes',
        'document_payment',
        'exchange_rates',
        'product_prices',
        'quantity_discounts',
        'opening_balances_stock',
        'opening_balances_parties',
        'employment_contracts',
    ];

    // ── ② جداول لديها company_id لكن تفتقد created_by/updated_by ──────
    private array $needsAuditCols = [
        'attachments',
        'fiscal_years',
        'notifications',
        'numbering_series',
        'product_lots',
        'product_packagings',
        'settings',
        'checks',
        'barcodes',
        'stock_movements',
    ];

    public function up(): void
    {
        // ════════════════════════════════════════
        // ① إضافة company_id للجداول الناقصة
        // ════════════════════════════════════════
        foreach ($this->needsCompanyId as $table) {
            if (!Schema::hasTable($table)) continue;
            if (Schema::hasColumn($table, 'company_id')) continue;

            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->foreignId('company_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $t->index('company_id', "idx_{$table}_company_id");
            });
        }

        // ════════════════════════════════════════
        // ② إضافة created_by/updated_by/deleted_by
        // ════════════════════════════════════════
        foreach ($this->needsAuditCols as $table) {
            if (!Schema::hasTable($table)) continue;

            Schema::table($table, function (Blueprint $t) use ($table) {

                if (!Schema::hasColumn($table, 'created_by')) {
                    $t->foreignId('created_by')
                        ->nullable()
                        ->constrained('users')
                        ->nullOnDelete()
                        ->cascadeOnUpdate();
                }

                if (!Schema::hasColumn($table, 'updated_by')) {
                    $t->foreignId('updated_by')
                        ->nullable()
                        ->constrained('users')
                        ->nullOnDelete()
                        ->cascadeOnUpdate();
                }

                // deleted_by فقط إذا كان الجدول يدعم SoftDeletes
                if (
                    Schema::hasColumn($table, 'deleted_at') &&
                    !Schema::hasColumn($table, 'deleted_by')
                ) {
                    $t->foreignId('deleted_by')
                        ->nullable()
                        ->constrained('users')
                        ->nullOnDelete()
                        ->cascadeOnUpdate();
                }
            });
        }

        // ════════════════════════════════════════
        // ③ إصلاح جدول companies
        // ════════════════════════════════════════
        Schema::table('companies', function (Blueprint $t) {

            if (!Schema::hasColumn('companies', 'created_by')) {
                $t->foreignId('created_by')
                    ->nullable()
                    ->after('owner_id')
                    ->constrained('users')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }

            if (!Schema::hasColumn('companies', 'updated_by')) {
                $t->foreignId('updated_by')
                    ->nullable()
                    ->after('owner_id')
                    ->constrained('users')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }

            if (!Schema::hasColumn('companies', 'deleted_by')) {
                $t->foreignId('deleted_by')
                    ->nullable()
                    ->after('owner_id')
                    ->constrained('users')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
        });

        // ════════════════════════════════════════
        // ④ Unique Constraints للجداول الجديدة
        // ════════════════════════════════════════
        $uniques = [
            'brands'        => ['company_id', 'name', 'brands_company_name_unique'],
            'families'      => ['company_id', 'name', 'families_company_name_unique'],
            'price_levels'  => ['company_id', 'name', 'price_levels_company_name_unique'],
            'payment_modes' => ['company_id', 'name', 'payment_modes_company_name_unique'],
        ];

        foreach ($uniques as $table => [$col1, $col2, $name]) {
            if (!Schema::hasColumn($table, $col1)) continue;
            try {
                Schema::table($table, fn($t) => $t->unique([$col1, $col2], $name));
            } catch (\Exception $e) {
                // Unique already exists — skip
            }
        }
    }

    public function down(): void
    {
        // ③ companies
        Schema::table('companies', function (Blueprint $t) {
            foreach (['created_by', 'updated_by', 'deleted_by'] as $col) {
                if (Schema::hasColumn('companies', $col)) {
                    try { $t->dropForeign([$col]); } catch (\Exception $e) {}
                    $t->dropColumn($col);
                }
            }
        });

        // ② audit cols
        foreach (array_reverse($this->needsAuditCols) as $table) {
            if (!Schema::hasTable($table)) continue;
            Schema::table($table, function (Blueprint $t) use ($table) {
                foreach (['deleted_by', 'updated_by', 'created_by'] as $col) {
                    if (Schema::hasColumn($table, $col)) {
                        try { $t->dropForeign([$col]); } catch (\Exception $e) {}
                        $t->dropColumn($col);
                    }
                }
            });
        }

        // ④ drop uniques first
        $uniques = [
            'brands'        => 'brands_company_name_unique',
            'families'      => 'families_company_name_unique',
            'price_levels'  => 'price_levels_company_name_unique',
            'payment_modes' => 'payment_modes_company_name_unique',
        ];
        foreach ($uniques as $table => $name) {
            if (Schema::hasTable($table)) {
                try { Schema::table($table, fn($t) => $t->dropUnique($name)); } catch (\Exception $e) {}
            }
        }

        // ① company_id
        foreach (array_reverse($this->needsCompanyId) as $table) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'company_id')) continue;
            Schema::table($table, function (Blueprint $t) use ($table) {
                try { $t->dropForeign(['company_id']); } catch (\Exception $e) {}
                $t->dropColumn('company_id');
            });
        }
    }
};
