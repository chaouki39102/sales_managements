<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * DatabaseSeeder — إنتاج
 * ══════════════════════════════════════════════════════════════════
 * يُشغَّل مرة واحدة عند نشر النظام لأول مرة:
 *   php artisan migrate --seed
 *   php artisan db:seed
 *
 * يُنفّذ GlobalSeeder فقط:
 *   1. ولايات + بلديات (WilayaCommuneSeeder)
 *   2. حساب super-admin (UserSeeder)
 *   3. صلاحيات + دور super-admin (GlobalRolesAndPermissionsSeeder)
 *
 * بعد الانتهاء:
 *   - السوبر أدمن يسجّل دخوله ويرى مودال إعداد النظام
 *     إذا اكتشف أن البيانات العالمية غير مكتملة.
 *   - كل مستخدم عادي يسجّل حساباً ثم ينشئ شركته.
 *   - CompanyObserver يُطلق CompanySeeder تلقائياً عند كل شركة جديدة.
 * ══════════════════════════════════════════════════════════════════
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(GlobalSeeder::class);
    }
}
