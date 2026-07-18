<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TreasuryAccountSeeder extends Seeder
{
    public function run(): void
    {
        $companyId  = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $currencyId = DB::table('currencies')->where('company_id', $companyId)->where('code', 'DZD')->value('id');
        $bankTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'bank')->value('id');
        $cashTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'cash')->value('id');

        if (!$cashTypeId && !$bankTypeId) {
            $this->command?->warn("  ⚠️  TreasuryAccountSeeder: treasury_account_types مفقودة — تم التخطي");
            return;
        }

        DB::table('treasury_accounts')->insert([
            [
                'company_id'               => $companyId,
                'name'                     => 'الصندوق الرئيسي',
                'code'                     => 'CASH01',
                'treasury_account_type_id' => $cashTypeId,
                'bank_name'                => null,
                'account_number'           => null,
                'currency_id'              => $currencyId,
                'is_default'               => true,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
            [
                'company_id'               => $companyId,
                'name'                     => 'البنك الوطني الجزائري',
                'code'                     => 'BNA710',
                'treasury_account_type_id' => $bankTypeId,
                'bank_name'                => 'BNA',
                'account_number'           => '00123456789',
                'currency_id'              => $currencyId,
                'is_default'               => false,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ]);
    }
}
