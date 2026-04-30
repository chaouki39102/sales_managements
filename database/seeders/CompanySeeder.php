<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $legalFormId = DB::table('legal_forms')->where('code', 'EURL')->value('id');
        $wilayaId    = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي

        $companyId = DB::table('companies')->insertGetId([
            'name'            => 'Mon Entreprise',
            'commercial_name' => 'Mon Entreprise',
            'slug'            => 'mon-entreprise',
            'activity'        => 'Commerce et distribution',
            'nif'             => '000000000000000',
            'legal_form_id'   => $legalFormId,
            'wilaya_id'       => $wilayaId,
            'phone'           => '032000000',
            'email'           => 'contact@monentreprise.dz',
            'is_active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // ربط المستخدم super-admin بالشركة
        $superAdminId = DB::table('users')->where('email', 'admin@mail.com')->value('id');

        if ($superAdminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $superAdminId,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // تعيين owner_id
            DB::table('companies')
                ->where('id', $companyId)
                ->update(['owner_id' => $superAdminId]);
        }
    }
}

