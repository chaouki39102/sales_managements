<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fiscal_years', function (Blueprint $table) {
            // إضافة company_id (إذا لم تكن موجودة – قد تكون أضيفت في migration السابقة)
            if (!Schema::hasColumn('fiscal_years', 'company_id')) {
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            }

            // إضافة قيد فريد لضمان عدم تكرار اسم السنة المالية داخل نفس المؤسسة
            $table->unique(['company_id', 'name'], 'fiscal_years_company_name_unique');

            // إضافة فهارس للبحث السريع
            $table->index(['company_id', 'is_current']);
            $table->index(['company_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::table('fiscal_years', function (Blueprint $table) {
            $table->dropUnique('fiscal_years_company_name_unique');
            $table->dropIndex(['company_id', 'is_current']);
            $table->dropIndex(['company_id', 'start_date', 'end_date']);
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
    }
};
