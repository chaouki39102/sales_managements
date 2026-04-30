<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 2. InventoryValuationMethodSeeder
 * ═══════════════════════════════════════════════════════════════════
 * مطلوب لجدول products
 */
class InventoryValuationMethodSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('inventory_valuation_methods')->insert([
            [
                'name' => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method' => 'fifo',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method' => 'lifo',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'المتوسط المرجح',
                'method' => 'weighted_average',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
