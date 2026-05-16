<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * GlobalSeeder — البيانات العالمية للإنتاج
 * ══════════════════════════════════════════════════════════════════
 * يُشغَّل مرة واحدة عند إعداد النظام.
 * جميع المراحل idempotent (آمنة للتكرار).
 *
 * يمكن إعادة تشغيله لاحقاً من لوحة الأدمن:
 *   POST /api/v1/admin/system/boot  ← يُشغّل نفس المنطق
 * ══════════════════════════════════════════════════════════════════
 */
class GlobalSeeder extends Seeder
{
    public function run(): void
    {
        // 1. حساب السوبر أدمن (يُنشأ من .env أو القيم الافتراضية)
        $this->call(UserSeeder::class);

        // 2. الولايات والبلديات الجزائرية (48 ولاية)
        $this->call(WilayaCommuneSeeder::class);

        // 3. الصلاحيات العالمية + دور super-admin + تعيينه للمستخدم
        $this->call(GlobalRolesAndPermissionsSeeder::class);

        $this->command?->info('');
        $this->command?->info('═══════════════════════════════════════════════════');
        $this->command?->info('✅ النظام جاهز — سجّل دخولك وابدأ العمل');
        $this->command?->info('═══════════════════════════════════════════════════');
    }
}
