<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PriceLevelSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('price_levels')->insert([
            [
                'name' => 'Prix de détail',
                'description' => 'سعر التجزئة',
                'is_default' => true,
                'active' => true,
                'display_order' => 1,
                'is_percentage' => false,
                'value' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix de gros',
                'description' => 'سعر الجملة',
                'is_default' => false,
                'active' => true,
                'display_order' => 2,
                'is_percentage' => true,
                'value' => -10.00, // خصم 10%
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix semi-gros',
                'description' => 'سعر نصف الجملة',
                'is_default' => false,
                'active' => true,
                'display_order' => 3,
                'is_percentage' => true,
                'value' => -20.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix spécial',
                'description' => 'سعر خاص',
                'is_default' => false,
                'active' => true,
                'display_order' => 4,
                'is_percentage' => false,
                'value' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
        ]);
    }
}
