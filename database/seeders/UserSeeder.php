<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // جلب أول شركة موجودة
        $companyId = DB::table('companies')->value('id');

        if (!$companyId) {
            $this->command->error('لا توجد شركة لإسنادها للمستخدمين. قم بتشغيل CompanySeeder أولاً.');
            return;
        }

        // إنشاء Super Admin - (الدور موجود وصحيح)
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
            'company_id' => $companyId,
        ]);
        $superAdmin->assignRole('super-admin');

        // إنشاء Admin User
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin.user@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
            'company_id' => $companyId,
        ]);

        // التعديل هنا: استبدال 'moderator' بـ 'admin' أو 'manager'
        $admin->assignRole('admin');
    }
}
