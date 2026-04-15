<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FiscalStampSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('fiscal_stamps')->insert([
            [
                'name' => 'Timbre 100 DA',
                'min_amount' => 0.00,
                'max_amount' => 1000.00,
                'stamp_value' => 100.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Timbre 300 DA',
                'min_amount' => 1000.01,
                'max_amount' => 5000.00,
                'stamp_value' => 300.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Timbre 1000 DA',
                'min_amount' => 5000.01,
                'max_amount' => null,
                'stamp_value' => 1000.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
