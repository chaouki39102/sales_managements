<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TreasuryAccountTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('treasury_account_types')->insert([
            ['company_id' => $companyId, 'name' => 'bank', 'label' => 'حساب بنكي', 'description' => 'حساب جاري لدى بنك', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'cash', 'label' => 'صندوق نقدي', 'description' => 'الخزنة النقدية', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}