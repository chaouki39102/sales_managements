<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * UserSeeder — إنتاج
 * ══════════════════════════════════════════════════════════════════
 * ينشئ حساب السوبر أدمن الأول فقط.
 * لا يُنشئ أي شركة — مالك النظام ينشئ شركته من الواجهة.
 *
 * بيانات الدخول تُقرأ من .env:
 *   SUPER_ADMIN_NAME=مدير النظام
 *   SUPER_ADMIN_EMAIL=admin@mail.com
 *   SUPER_ADMIN_PASSWORD=password
 *
 * الدور يُعيَّن لاحقاً في GlobalRolesAndPermissionsSeeder
 * بعد إنشاء الصلاحيات.
 * ══════════════════════════════════════════════════════════════════
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('SUPER_ADMIN_EMAIL',    'admin@mail.com')??'admin@mail.com';
        $name     = env('SUPER_ADMIN_NAME',     'مدير النظام')??'مدير النظام';
        $password = env('SUPER_ADMIN_PASSWORD', 'password')??'password';

        User::firstOrCreate(
            ['email' => $email],
            [
                'name'              => $name,
                'password'          => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        $this->command?->info("✅ حساب مدير النظام: {$email}");
    }
}
