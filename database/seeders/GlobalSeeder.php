<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * GlobalSeeder — البيانات العالمية المشتركة
 * ══════════════════════════════════════════════════════════════════
 * يُشغَّل مرة واحدة عند أول نشر للنظام.
 * جميع المراحل idempotent (آمنة للتكرار).
 *
 * يمكن إعادة تشغيله من لوحة الأدمن:
 *   POST /api/v1/admin/system/boot
 * ══════════════════════════════════════════════════════════════════
 */
class GlobalSeeder extends Seeder
{
    public function run(): void
    {
        // 1. الولايات والبلديات الجزائرية
        $this->call(WilayaCommuneSeeder::class);

        // 2. حساب super-admin (يُقرأ من .env)
        $this->call(UserSeeder::class);

        // 3. الصلاحيات العالمية + دور super-admin
        $this->call(GlobalRolesAndPermissionsSeeder::class);

        $this->command?->info('');
        $this->command?->info('══════════════════════════════════════════════');
        $this->command?->info('✅ النظام جاهز — سجّل دخولك وابدأ العمل');
        $this->command?->info('══════════════════════════════════════════════');
    }
}
