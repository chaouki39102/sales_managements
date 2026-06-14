<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * فهرس إضافي على opening_balances_parties
 *
 * الجدول يحتوي UNIQUE على (company_id, fiscal_year_id, party_id)
 * لكن هذا القيد لا يُضاف دائماً كفهرس قابل للبحث في MySQL بكفاءة
 * عند الاستعلام بـ (company_id + party_id + fiscal_year_id) بترتيب مختلف.
 *
 * الاستعلام في PartyBalanceService:
 *   WHERE company_id = X AND party_id = Y AND fiscal_year_id = Z
 *
 * الفهرس المُضاف يُسرّع هذا الاستعلام المباشر بدون الاعتماد على ترتيب
 * أعمدة الـ UNIQUE constraint.
 *
 * كذلك فهرس على opening_balances_stock لنفس السبب.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opening_balances_parties', function (Blueprint $table) {
            $table->index(
                ['company_id', 'party_id', 'fiscal_year_id'],
                'idx_obp_company_party_year'
            );
        });

        Schema::table('opening_balances_stock', function (Blueprint $table) {
            $table->index(
                ['company_id', 'product_id', 'warehouse_id', 'fiscal_year_id'],
                'idx_obs_company_product_wh_year'
            );
        });
    }

    public function down(): void
    {
        Schema::table('opening_balances_parties', function (Blueprint $table) {
            $table->dropIndex('idx_obp_company_party_year');
        });

        Schema::table('opening_balances_stock', function (Blueprint $table) {
            $table->dropIndex('idx_obs_company_product_wh_year');
        });
    }
};
