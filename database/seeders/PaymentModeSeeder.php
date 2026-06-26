<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId    = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $cashAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'CASH01')->value('id');
        $bankAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'BNA710')->value('id');

        DB::table('payment_modes')->insert([
            ['company_id' => $companyId, 'name' => 'نقداً',         'code' => 'CASH',  'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'شيك',           'code' => 'CHQ',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'تحويل بنكي',   'code' => 'VIR',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'بطاقة بنكية',  'code' => 'CB',    'treasury_account_id' => $bankAccountId, 'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'دفع آجل',      'code' => 'CREDIT','treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}