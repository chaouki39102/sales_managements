<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $wilayaId = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي

        // جلب المستخدم الأول الذي أُنشئ في UserSeeder
        $superAdminId = DB::table('users')->where('email', 'admin@mail.com')->value('id');

        $companyId = DB::table('companies')->insertGetId([
            'name'            => 'Mon Entreprise',
            'commercial_name' => 'Mon Entreprise',
            'slug'            => 'mon-entreprise',
            'activity'        => 'Commerce et distribution',
            'nif'             => '000000000000000',
            'wilaya_id'       => $wilayaId,
            'phone'           => '032000000',
            'email'           => 'contact@monentreprise.dz',
            'owner_id'        => $superAdminId,
            'active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // ضبط company_id في config لاستخدامه في Seeders اللاحقة
        config(['seeding.company_id' => $companyId]);

        // ربط المستخدمين بالشركة عبر company_user
        if ($superAdminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $superAdminId,
                'is_default' => true,
                'role'       => 'super-admin',
                'joined_at'  => now(),
                'active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $adminId = DB::table('users')->where('email', 'admin.user@mail.com')->value('id');
        if ($adminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $adminId,
                'is_default' => true,
                'role'       => 'admin',
                'joined_at'  => now(),
                'active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
