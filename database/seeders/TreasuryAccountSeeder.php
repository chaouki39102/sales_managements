<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TreasuryAccountSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
       $companyId  = 2;
$currencyId = DB::table('currencies')->where('code', 'DZD')->value('id');
$bankTypeId = DB::table('treasury_account_types')->where('name', 'bank')->value('id');
$cashTypeId = DB::table('treasury_account_types')->where('name', 'cash')->value('id');

DB::table('treasury_accounts')->where('company_id', $companyId)->delete();

DB::table('treasury_accounts')->insert([
    'company_id'               => $companyId,
    'name'                     => 'الصندوق الرئيسي',
    'code'                     => 'CASH01',
    'treasury_account_type_id' => $cashTypeId,
    'bank_name'                => null,
    'account_number'           => null,
    'currency_id'              => $currencyId,
    'initial_balance'          => 0.00,
    'current_balance'          => 0.00,
    'is_default'               => true,
    'active'                   => true,
    'created_at'               => now(),
    'updated_at'               => now(),
]);

DB::table('treasury_accounts')->insert([
    'company_id'               => $companyId,
    'name'                     => 'البنك الوطني الجزائري',
    'code'                     => 'BNA01',
    'treasury_account_type_id' => $bankTypeId,
    'bank_name'                => 'BNA',
    'account_number'           => '00123456789',
    'currency_id'              => $currencyId,
    'initial_balance'          => 0.00,
    'current_balance'          => 0.00,
    'is_default'               => false,
    'active'                   => true,
    'created_at'               => now(),
    'updated_at'               => now(),
]);
=======
        $companyId  = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $currencyId = DB::table('currencies')->where('company_id', $companyId)->where('code', 'DZD')->value('id');
        $bankTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'bank')->value('id');
        $cashTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'cash')->value('id');

        DB::table('treasury_accounts')->insert([
            [
                'company_id'               => $companyId,
                'name'                     => 'الصندوق الرئيسي',
                'code'                     => 'CASH01',
                'treasury_account_type_id' => $cashTypeId,
                'currency_id'              => $currencyId,
                'initial_balance'          => 0.00,
                'current_balance'          => 0.00,
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
                'initial_balance'          => 0.00,
                'current_balance'          => 0.00,
                'is_default'               => false,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}
