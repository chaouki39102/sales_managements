<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * (جدول جديد)
 * إنشاء جدول الأرصدة الافتتاحية للأطراف (عملاء وموردون)
 * لتسجيل رصيد الدين/المستحقات في بداية كل سنة مالية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_balances_parties', function (Blueprint $table) {
            $table->id();

            // الربط بالسنة المالية (يحذف الرصيد إذا حذفت السنة)
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();

            // الربط بالمتعامل (يمنع حذف متعامل له رصيد افتتاحي)
            $table->foreignId('party_id')->constrained('parties')->restrictOnDelete();

            // الرصيد الافتتاحي
            $table->decimal('opening_balance', 15, 4);
            $table->enum('balance_type', ['debit', 'credit'])->comment('debit = رصيد مدين, credit = رصيد دائن');

            $table->timestamps();

            // ضمان عدم تكرار المتعامل في نفس السنة
            $table->unique(['fiscal_year_id', 'party_id'], 'opening_party_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balances_parties');
    }
};
