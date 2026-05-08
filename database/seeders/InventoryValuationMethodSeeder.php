<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventoryValuationMethodSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        DB::table('inventory_valuation_methods')->upsert([
            [
                'name'       => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'     => 'fifo',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'     => 'lifo',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'المتوسط المرجح',
                'method'     => 'weighted_average',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('inventory_valuation_methods')->insert([
            [
                'company_id'  => $companyId,
                'name'        => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'      => 'fifo',
                'is_default'  => true,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'      => 'lifo',
                'is_default'  => false,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'المتوسط المرجح',
                'method'      => 'weighted_average',
                'is_default'  => false,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
            ],
        ], ['name']);
    }
}
