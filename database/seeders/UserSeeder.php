<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * UserSeeder — حساب super-admin فقط
 * ══════════════════════════════════════════════════════════════════
 * لا ينشئ شركة.
 * لا يُعيّن أدواراً (تتولاها GlobalRolesAndPermissionsSeeder).
 * لا ينشئ مستخدم admin.user (يسجل بنفسه من الواجهة).
 *
 * البيانات تُقرأ من .env:
 *   SUPER_ADMIN_EMAIL=admin@mail.com
 *   SUPER_ADMIN_PASSWORD=password
 *   SUPER_ADMIN_NAME=Super Admin
 * ══════════════════════════════════════════════════════════════════
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('SUPER_ADMIN_EMAIL',    'admin@mail.com');
        $name     = env('SUPER_ADMIN_NAME',     'Super Admin');
        $password = env('SUPER_ADMIN_PASSWORD', 'password');

        User::firstOrCreate(
            ['email' => $email],
            [
                'name'              => $name,
                'password'          => Hash::make($password),
                'active'            => true,
                'email_verified_at' => now(),
            ]
        );

        $this->command?->info("✅ حساب مدير النظام: {$email}");
    }
}
