<?php

// ════════════════════════════════════════════════════════════════════════
// 2026_05_04_120000_make_roles_permissions_units_tenant.php
//
// تحويل roles / permissions / units إلى جداول Tenant
//
// المشكلة:
//   - roles و permissions كانت مشتركة بين كل الشركات (Spatie global)
//     → شركة A ترى أدوار شركة B — خطأ أمني
//   - units كانت global بينما الشركات قد تحتاج وحدات مخصصة
//
// الحل:
//   ① إضافة company_id لـ roles, permissions, model_has_roles,
//     model_has_permissions, role_has_permissions
//   ② إضافة company_id لـ units
//   ③ Unique constraints محدّثة لتشمل company_id
// ════════════════════════════════════════════════════════════════════════

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ════════════════════════════════════════
        // ① roles
        // ════════════════════════════════════════
        Schema::table('roles', function (Blueprint $t) {

            if (!Schema::hasColumn('roles', 'company_id')) {
                $t->foreignId('company_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $t->index('company_id', 'idx_roles_company_id');
            }

            // إزالة unique constraint القديم (name + guard_name فقط)
            // ثم إعادته مع company_id
            try {
                $t->dropUnique(['name', 'guard_name']);
            } catch (\Exception $e) {}

            try {
                $t->unique(['company_id', 'name', 'guard_name'], 'roles_company_name_guard_unique');
            } catch (\Exception $e) {}
        });

        // ════════════════════════════════════════
        // ② permissions
        // ════════════════════════════════════════
        Schema::table('permissions', function (Blueprint $t) {

            if (!Schema::hasColumn('permissions', 'company_id')) {
                $t->foreignId('company_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $t->index('company_id', 'idx_permissions_company_id');
            }

            try {
                $t->dropUnique(['name', 'guard_name']);
            } catch (\Exception $e) {}

            try {
                $t->unique(['company_id', 'name', 'guard_name'], 'permissions_company_name_guard_unique');
            } catch (\Exception $e) {}
        });

        // ════════════════════════════════════════
        // ③ جداول pivot الخاصة بـ Spatie
        //    نضيف company_id للفلترة السريعة
        //    (ليس FK — لأن الـ pivot لا تحتاج cascade مستقل)
        // ════════════════════════════════════════
        Schema::table('role_has_permissions', function (Blueprint $t) {
            if (!Schema::hasColumn('role_has_permissions', 'company_id')) {
                $t->unsignedBigInteger('company_id')->nullable()->after('role_id');
                $t->index('company_id', 'idx_rhp_company_id');
            }
        });

        Schema::table('model_has_roles', function (Blueprint $t) {
            if (!Schema::hasColumn('model_has_roles', 'company_id')) {
                $t->unsignedBigInteger('company_id')->nullable()->after('role_id');
                $t->index('company_id', 'idx_mhr_company_id');
            }
        });

        Schema::table('model_has_permissions', function (Blueprint $t) {
            if (!Schema::hasColumn('model_has_permissions', 'company_id')) {
                $t->unsignedBigInteger('company_id')->nullable()->after('permission_id');
                $t->index('company_id', 'idx_mhp_company_id');
            }
        });

        // ════════════════════════════════════════
        // ④ units
        // ════════════════════════════════════════
        Schema::table('units', function (Blueprint $t) {

            if (!Schema::hasColumn('units', 'company_id')) {
                $t->foreignId('company_id')
                    ->nullable()          // null = وحدة نظام (للجميع)
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $t->index('company_id', 'idx_units_company_id');
            }

            // audit columns
            if (!Schema::hasColumn('units', 'created_by')) {
                $t->foreignId('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }

            if (!Schema::hasColumn('units', 'updated_by')) {
                $t->foreignId('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }

            // unique: نفس الاسم لا يتكرر في نفس الشركة
            try {
                $t->unique(['company_id', 'name'], 'units_company_name_unique');
            } catch (\Exception $e) {}
        });
    }

    public function down(): void
    {
        // ④ units
        Schema::table('units', function (Blueprint $t) {
            try { $t->dropUnique('units_company_name_unique'); } catch (\Exception $e) {}
            foreach (['updated_by', 'created_by'] as $col) {
                if (Schema::hasColumn('units', $col)) {
                    try { $t->dropForeign([$col]); } catch (\Exception $e) {}
                    $t->dropColumn($col);
                }
            }
            if (Schema::hasColumn('units', 'company_id')) {
                try { $t->dropIndex('idx_units_company_id'); } catch (\Exception $e) {}
                try { $t->dropForeign(['company_id']); } catch (\Exception $e) {}
                $t->dropColumn('company_id');
            }
        });

        // ③ pivot tables
        foreach (['model_has_permissions' => 'idx_mhp_company_id', 'model_has_roles' => 'idx_mhr_company_id', 'role_has_permissions' => 'idx_rhp_company_id'] as $table => $index) {
            Schema::table($table, function (Blueprint $t) use ($table, $index) {
                if (Schema::hasColumn($table, 'company_id')) {
                    try { $t->dropIndex($index); } catch (\Exception $e) {}
                    $t->dropColumn('company_id');
                }
            });
        }

        // ② permissions
        Schema::table('permissions', function (Blueprint $t) {
            try { $t->dropUnique('permissions_company_name_guard_unique'); } catch (\Exception $e) {}
            if (Schema::hasColumn('permissions', 'company_id')) {
                try { $t->dropIndex('idx_permissions_company_id'); } catch (\Exception $e) {}
                try { $t->dropForeign(['company_id']); } catch (\Exception $e) {}
                $t->dropColumn('company_id');
            }
            try { $t->unique(['name', 'guard_name']); } catch (\Exception $e) {}
        });

        // ① roles
        Schema::table('roles', function (Blueprint $t) {
            try { $t->dropUnique('roles_company_name_guard_unique'); } catch (\Exception $e) {}
            if (Schema::hasColumn('roles', 'company_id')) {
                try { $t->dropIndex('idx_roles_company_id'); } catch (\Exception $e) {}
                try { $t->dropForeign(['company_id']); } catch (\Exception $e) {}
                $t->dropColumn('company_id');
            }
            try { $t->unique(['name', 'guard_name']); } catch (\Exception $e) {}
        });
    }
};
