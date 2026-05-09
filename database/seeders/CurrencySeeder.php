<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('currencies')->upsert([
            [
                'company_id'       => $companyId,
                'name'             => 'Dinar Algérien',
                'code'             => 'DZD',
                'symbol'           => 'د.ج',
                'decimal_places'   => 2,
                'is_base_currency' => true,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'company_id'       => $companyId,
                'name'             => 'Euro',
                'code'             => 'EUR',
                'symbol'           => '€',
                'decimal_places'   => 2,
                'is_base_currency' => false,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'company_id'       => $companyId,
                'name'             => 'US Dollar',
                'code'             => 'USD',
                'symbol'           => '$',
                'decimal_places'   => 2,
                'is_base_currency' => false,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ], ['company_id', 'code']); // التصحيح: المفتاح الفريد المركب
    }
}
