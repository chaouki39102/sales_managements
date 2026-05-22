<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

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
 * ══════════════════════════════════════════════════════════════════
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(GlobalSeeder::class);
    }
}
