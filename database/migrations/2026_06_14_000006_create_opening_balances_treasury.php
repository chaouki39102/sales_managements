<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * توحيد الخزينة مع نمط التناظر الكامل:
 *
 *   قبل:
 *     treasury_accounts.initial_balance  → رصيد افتتاحي ثابت بلا سنة مالية
 *     treasury_accounts.current_balance  → لا يُحدَّث أبداً (PaymentService فارغ)
 *
 *   بعد:
 *     opening_balances_treasury          → مرآة opening_balances_stock/parties
 *     TreasuryBalanceService::getBalanceAt() → يحسب لحظياً
 *     PaymentService::afterCreate/Delete → يُحدِّث current_balance كـ cache فقط
 *
 * الجداول:
 *   1. إنشاء opening_balances_treasury
 *   2. إضافة payments.direction  (in/out) لتحديد اتجاه الدفعة على الخزينة
 *   3. حذف initial_balance و current_balance من treasury_accounts
 *      (current_balance يُعاد كـ computed cache في migration منفصلة إن أردت)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. جدول الأرصدة الافتتاحية للخزينة
        Schema::create('opening_balances_treasury', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                  ->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')
                  ->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')
                  ->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('opening_balance', 15, 4)->default(0);
            $table->timestamps();

            $table->unique(
                ['company_id', 'fiscal_year_id', 'treasury_account_id'],
                'obt_year_account_unique'
            );
            $table->index(
                ['company_id', 'treasury_account_id', 'fiscal_year_id'],
                'idx_obt_account_year'
            );
        });

        // 2. إضافة direction على payments لتحديد اتجاه التدفق على الخزينة
        //    'in'  = دفعة واردة  (الزبون يدفع لنا   → يزيد رصيد الخزينة)
        //    'out' = دفعة صادرة (نحن ندفع للمورد   → ينقص رصيد الخزينة)
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('direction', ['in', 'out'])
                  ->default('in')
                  ->after('status')
                  ->comment('in = وارد (زيادة الخزينة), out = صادر (نقص الخزينة)');

            $table->index(
                ['company_id', 'treasury_account_id', 'fiscal_year_id', 'status', 'direction', 'payment_date'],
                'idx_payments_treasury_balance'
            );
        });

        // 3. ترحيل initial_balance الموجود إلى opening_balances_treasury
        //    مرتبط بأول سنة مالية للشركة
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement(<<<'SQL'
                INSERT INTO opening_balances_treasury
                    (company_id, fiscal_year_id, treasury_account_id, opening_balance, created_at, updated_at)
                SELECT
                    ta.company_id,
                    fy.id as fiscal_year_id,
                    ta.id as treasury_account_id,
                    ta.initial_balance,
                    NOW(),
                    NOW()
                FROM treasury_accounts ta
                INNER JOIN (
                    SELECT company_id, MIN(id) as id
                    FROM fiscal_years
                    GROUP BY company_id
                ) fy ON fy.company_id = ta.company_id
                WHERE ta.initial_balance != 0
                  AND ta.deleted_at IS NULL
            SQL);
        }

        // 4. حذف الحقلين القديمين
        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->dropColumn(['initial_balance', 'current_balance']);
        });
    }

    public function down(): void
    {
        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_treasury_balance');
            $table->dropColumn('direction');
        });

        Schema::dropIfExists('opening_balances_treasury');
    }
};
