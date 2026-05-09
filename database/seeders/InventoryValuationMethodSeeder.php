<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventoryValuationMethodSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('inventory_valuation_methods')->upsert([
            [
                'company_id'  => $companyId,
                'name'        => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'      => 'fifo',
                'is_default'  => true,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'      => 'lifo',
                'is_default'  => false,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'المتوسط المرجح',
                'method'      => 'weighted_average',
                'is_default'  => false,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ], ['company_id', 'name']); // المفتاح الفريد المركب
    }
}