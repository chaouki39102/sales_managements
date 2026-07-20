<?php

namespace Database\Seeders;

use App\Services\CompanyRoleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * DatabaseSeeder — نقطة الدخول الوحيدة
 * ══════════════════════════════════════════════════════════════════
 * php artisan migrate --seed
 * php artisan db:seed
 *
 * يُشغّل GlobalSeeder فقط:
 *   1. WilayaCommuneSeeder    ← بيانات جغرافية
 *   2. UserSeeder             ← super-admin فقط
 *   3. GlobalRolesAndPermissionsSeeder ← صلاحيات + دور super-admin
 *
 * ─────────────────────────────────────────────────────────────────
 * ما يتم لاحقاً من الواجهة:
 *
 *   السوبر أدمن (AdminBootModal):
 *     POST /api/v1/admin/system/boot
 *       إذا احتاج إعادة تثبيت البيانات العالمية
 *
 *   مالك الشركة — تلقائي:
 *     CompanyObserver::created() → CompanySeeder
 *       (currencies, tvas, units, warehouses, roles, fiscal_year...)
 *
 *   مالك الشركة — يدوي اختياري:
 *     DataSeedingModal → POST /api/v1/{company}/seed/{key}
 *
 * php artisan db:seed                                  ← GlobalSeeder فقط
 * php artisan db:seed --class=DatabaseSeeder           ← كل الشركات (للمستخدمين الجدد)
 * php artisan db:seed --class=DocumentTypeConversionSeeder  ← جدول التحويل الحالي
 * ══════════════════════════════════════════════════════════════════
 */
class DatabaseSeeder extends Seeder
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function run(): void
    {
        $this->call(GlobalSeeder::class);
        $this->call(PlanSeeder::class);

        $companies = DB::table('companies')->pluck('id');

        foreach ($companies as $cid) {
            config(['seeding.company_id' => $cid]);

            // بذر document_type_conversions للشركات القائمة
            if (!DB::table('document_type_conversions')->where('company_id', $cid)->exists()) {
                $this->call(DocumentTypeConversionSeeder::class);
            }

            // بذر أدوار الشركة إذا لم تكن موجودة (للشركات القائمة قبل إضافة CompanyObserver)
            $roleCount = DB::table('roles')->where('company_id', $cid)->count();
            if ($roleCount === 0) {
                $this->roleService->seedRoles($cid);
                $this->command?->info("✅ تم إنشاء أدوار الشركة #{$cid}");
            }
        }

        $this->call(PrintTemplateSeeder::class);
    }
}
