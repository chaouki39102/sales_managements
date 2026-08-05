<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // reference = رقم مستند CMD، وترقيم المستندات فريد لكل شركة على حدة
        // (generateDocumentNumber يبحث بـ company_id). الفهرس الفريد العام كان
        // عيباً كامناً: شركتان تصلان لنفس التسلسل في نفس السنة تصطدمان
        // (CMD-2026-000001 في كلتا الشركتين) → خطأ 500 عند إنشاء طلب.
        // الفريد الآن مركّب (company_id, reference) مطابقاً لجدول portal_users.
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropUnique('portal_orders_reference_unique');
        });

        Schema::table('portal_orders', function (Blueprint $table) {
            $table->unique(['company_id', 'reference'], 'portal_orders_company_reference_unique');
        });
    }

    public function down(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropUnique('portal_orders_company_reference_unique');
        });

        Schema::table('portal_orders', function (Blueprint $table) {
            $table->unique('reference', 'portal_orders_reference_unique');
        });
    }
};
