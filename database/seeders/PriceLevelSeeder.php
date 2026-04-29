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
                'name'         => 'Prix de détail',
                'description'  => 'سعر التجزئة',
                'is_default'   => true,
                'active'       => true,
                'display_order'=> 1,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'Prix de gros',
                'description'  => 'سعر الجملة - خصم 10%',
                'is_default'   => false,
                'active'       => true,
                'display_order'=> 2,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'Prix spécial',
                'description'  => 'سعر خاص - خصم 15%',
                'is_default'   => false,
                'active'       => true,
                'display_order'=> 3,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ]);
    }
}
