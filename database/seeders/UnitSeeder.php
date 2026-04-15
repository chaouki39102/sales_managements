<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Unité', 'symbol' => 'UN', 'description' => 'وحدة'],
            ['name' => 'Pièce', 'symbol' => 'PC', 'description' => 'قطعة'],
            ['name' => 'Boîte', 'symbol' => 'BTE', 'description' => 'علبة'],
            ['name' => 'Carton', 'symbol' => 'CTN', 'description' => 'كرتون'],
            ['name' => 'Palette', 'symbol' => 'PLT', 'description' => 'باليطة'],
            ['name' => 'Kilogramme', 'symbol' => 'KG', 'description' => 'كيلوغرام'],
            ['name' => 'Gramme', 'symbol' => 'G', 'description' => 'غرام'],
            ['name' => 'Tonne', 'symbol' => 'T', 'description' => 'طن'],
            ['name' => 'Litre', 'symbol' => 'L', 'description' => 'لتر'],
            ['name' => 'Mètre', 'symbol' => 'M', 'description' => 'متر'],
            ['name' => 'Mètre carré', 'symbol' => 'M²', 'description' => 'متر مربع'],
            ['name' => 'Mètre cube', 'symbol' => 'M³', 'description' => 'متر مكعب'],
        ];

        $order = 1;
        foreach ($units as $unit) {
            DB::table('units')->insert([
                'name' => $unit['name'],
                'symbol' => $unit['symbol'],
                'description' => $unit['description'],
                'active' => true,
                'display_order' => $order++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
