<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1. حذف parties.initial_balance
 *    السبب: opening_balances_parties أصبح المصدر الوحيد للرصيد الافتتاحي
 *    مع دعم تعدد السنوات المالية — وجود الحقلين معاً يعني مصدرين للحقيقة.
 *
 * 2. إضافة فهرس مركّب على payments لتسريع استعلام PartyBalanceService
 *    الاستعلام: WHERE company_id + party_id + fiscal_year_id + status + payment_date
 *    الفهارس الموجودة لا تغطي fiscal_year_id + status معاً في نفس الفهرس.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. حذف initial_balance من parties
        Schema::table('parties', function (Blueprint $table) {
            $table->dropColumn('initial_balance');
        });

        // 2. فهرس مركّب لاستعلام رصيد المتعامل (PartyBalanceService::getBalanceAt)
        Schema::table('payments', function (Blueprint $table) {
            $table->index(
                ['company_id', 'party_id', 'fiscal_year_id', 'status', 'payment_date'],
                'idx_payments_party_balance_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->decimal('initial_balance', 15, 4)->default(0.00);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_party_balance_lookup');
        });
    }
};
