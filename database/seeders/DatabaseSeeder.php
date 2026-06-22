<?php

namespace Database\Seeders;

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
    public function run(): void
    {
        $this->call(GlobalSeeder::class);

        // بذر document_type_conversions للشركات القائمة
        // (يُسكّب إذا كان الجدول فارغاً لتلك الشركة)
        $companies = \DB::table('companies')->pluck('id');
        foreach ($companies as $cid) {
            if (!\DB::table('document_type_conversions')->where('company_id', $cid)->exists()) {
                config(['seeding.company_id' => $cid]);
                $this->call(DocumentTypeConversionSeeder::class);
            }
        }
    }
}
