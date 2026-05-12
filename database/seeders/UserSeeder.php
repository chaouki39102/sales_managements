<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. التأكد من وجود الأدوار أولاً في قاعدة البيانات
        // (خطوة احتياطية في حال لم يتم تشغيل RolesAndPermissionsSeeder)
        $superAdminRole = Role::firstOrCreate(['name' => User::ROLE_SUPER_ADMIN, 'guard_name' => 'web']);
        $adminRole      = Role::firstOrCreate(['name' => User::ROLE_ADMIN, 'guard_name' => 'web']);

        // 2. إنشاء Super Admin
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@mail.com'],
            [
                'name'              => 'Super Admin',
                'password'          => 'password', // التشفير يتم تلقائياً عبر الـ Model Cast
                'active'            => true,
                'email_verified_at' => now(),
            ]
        );

        // إسناد الدور (assignRole تمسح الأدوار القديمة وتضع الجديد أو تضيفه حسب الإعداد)
        if (!$superAdmin->hasRole(User::ROLE_SUPER_ADMIN)) {
            $superAdmin->assignRole($superAdminRole);
        }

        // 3. إنشاء Admin User
        $adminUser = User::updateOrCreate(
            ['email' => 'admin.user@mail.com'],
            [
                'name'              => 'Admin User',
                'password'          => 'password',
                'active'            => true,
                'email_verified_at' => now(),
            ]
        );

        if (!$adminUser->hasRole(User::ROLE_ADMIN)) {
            $adminUser->assignRole($adminRole);
        }
    }
}
