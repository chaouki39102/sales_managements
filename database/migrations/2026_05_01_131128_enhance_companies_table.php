<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تحسين جدول companies لدعم تحكم كامل من Super Admin
 *
 * يضيف:
 *  ① حقول الحالة والتعليق  (suspended_at, suspension_reason, deactivated_at, deactivated_by)
 *  ② حقول الخطة والحدود    (plan, max_users, max_warehouses, max_products, trial_ends_at)
 *  ③ حقول التوثيق والإدارة (verified_at, verified_by, notes, settings_json)
 *  ④ تحسين جدول company_user (role, invited_by, joined_at, is_active)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ═══════════════════════════════════════
        // 1. تحسين جدول companies
        // ═══════════════════════════════════════
        Schema::table('companies', function (Blueprint $table) {

            // ── ① حقول الحالة والتعليق ──
            // الفرق بين is_active و suspended:
            //   is_active = false   → الشركة مُغلقة نهائياً (مالك قرر)
            //   suspended_at = now  → مُعلّقة مؤقتاً بقرار Super Admin (فواتير متأخرة...)
            $table->timestamp('suspended_at')
                  ->nullable()
                  ->after('is_active')
                  ->comment('تاريخ التعليق المؤقت — null تعني غير معلّقة');

            $table->string('suspension_reason', 500)
                  ->nullable()
                  ->after('suspended_at')
                  ->comment('سبب التعليق — يظهر لمالك الشركة');

            $table->foreignId('suspended_by')
                  ->nullable()
                  ->after('suspension_reason')
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('المشرف الذي علّق الشركة');

            $table->timestamp('deactivated_at')
                  ->nullable()
                  ->after('suspended_by')
                  ->comment('تاريخ إيقاف التفعيل النهائي');

            $table->foreignId('deactivated_by')
                  ->nullable()
                  ->after('deactivated_at')
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('المشرف الذي أوقف تفعيل الشركة');

            // ── ② حقول الخطة والحدود ──
            $table->string('plan', 30)
                  ->default('free')
                  ->after('deactivated_by')
                  ->comment('نوع الخطة: free | starter | professional | enterprise');

            $table->timestamp('trial_ends_at')
                  ->nullable()
                  ->after('plan')
                  ->comment('تاريخ انتهاء الفترة التجريبية');

            $table->unsignedSmallInteger('max_users')
                  ->default(3)
                  ->after('trial_ends_at')
                  ->comment('الحد الأقصى لعدد المستخدمين حسب الخطة');

            $table->unsignedSmallInteger('max_warehouses')
                  ->default(1)
                  ->after('max_users')
                  ->comment('الحد الأقصى لعدد المستودعات');

            $table->unsignedInteger('max_products')
                  ->default(500)
                  ->after('max_warehouses')
                  ->comment('الحد الأقصى لعدد المنتجات');

            // ── ③ حقول التوثيق والإدارة الداخلية ──
            $table->timestamp('verified_at')
                  ->nullable()
                  ->after('max_products')
                  ->comment('تاريخ توثيق الشركة من Super Admin');

            $table->foreignId('verified_by')
                  ->nullable()
                  ->after('verified_at')
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('المشرف الذي وثّق الشركة');

            $table->text('notes')
                  ->nullable()
                  ->after('verified_by')
                  ->comment('ملاحظات داخلية — مرئية لـ Super Admin فقط');

            // إعدادات مرنة JSON — مثل: تفعيل ميزات معينة لهذه الشركة تحديداً
            $table->json('settings_json')
                  ->nullable()
                  ->after('notes')
                  ->comment('إعدادات خاصة بالشركة (feature flags, overrides...)');

            // ── فهارس ──
            $table->index('plan',         'idx_companies_plan');
            $table->index('suspended_at', 'idx_companies_suspended');
            $table->index('verified_at',  'idx_companies_verified');
            $table->index('trial_ends_at','idx_companies_trial');
        });

        // ═══════════════════════════════════════
        // 2. تحسين جدول company_user (Pivot)
        // ═══════════════════════════════════════
        Schema::table('company_user', function (Blueprint $table) {

            // دور المستخدم داخل هذه الشركة تحديداً
            // (مستقل عن دوره في Spatie — المستخدم قد يكون admin في شركة وموظف في أخرى)
            $table->string('role', 30)
                  ->default('member')
                  ->after('is_default')
                  ->comment('دور المستخدم في هذه الشركة: owner | admin | manager | member | viewer');

            // من قام بالدعوة
            $table->foreignId('invited_by')
                  ->nullable()
                  ->after('role')
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('المستخدم الذي أضاف هذا العضو');

            // تاريخ قبول الدعوة/الانضمام الفعلي
            $table->timestamp('joined_at')
                  ->nullable()
                  ->after('invited_by')
                  ->comment('تاريخ الانضمام الفعلي — null تعني دعوة معلّقة');

            // إمكانية إلغاء تفعيل عضو داخل شركة بدون حذفه نهائياً
            $table->boolean('is_active')
                  ->default(true)
                  ->after('joined_at')
                  ->comment('هل العضو مفعّل في هذه الشركة؟');

            $table->index(['company_id', 'role'],      'idx_cu_company_role');
            $table->index(['company_id', 'is_active'],  'idx_cu_company_active');
        });
    }

    public function down(): void
    {
        Schema::table('company_user', function (Blueprint $table) {
            $table->dropForeign(['invited_by']);
            $table->dropColumn(['role', 'invited_by', 'joined_at', 'is_active']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign(['suspended_by']);
            $table->dropForeign(['deactivated_by']);
            $table->dropForeign(['verified_by']);
            $table->dropColumn([
                'suspended_at', 'suspension_reason', 'suspended_by',
                'deactivated_at', 'deactivated_by',
                'plan', 'trial_ends_at', 'max_users', 'max_warehouses', 'max_products',
                'verified_at', 'verified_by',
                'notes', 'settings_json',
            ]);
        });
    }
};
