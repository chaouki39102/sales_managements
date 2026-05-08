<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin — لا يحتاج company_id (الجدول لا يحتوي هذا العمود)
        User::create([
            'name'              => 'Super Admin',
            'email'             => 'admin@mail.com',
            'password'          => Hash::make('password'),
            'active'            => true,
            'email_verified_at' => now(),
        ]);

        // Admin User
        User::create([
            'name'              => 'Admin User',
            'email'             => 'admin.user@mail.com',
            'password'          => Hash::make('password'),
            'active'            => true,
            'email_verified_at' => now(),
        ]);

        // ملاحظة: الأدوار تُسند بعد تشغيل RolesAndPermissionsSeeder عبر CompanySeeder
    }
}
