<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        $units = [
            ['name' => 'Unité',       'symbol' => 'UN',  'description' => 'وحدة'],
            ['name' => 'Pièce',       'symbol' => 'PC',  'description' => 'قطعة'],
            ['name' => 'Boîte',       'symbol' => 'BTE', 'description' => 'علبة'],
            ['name' => 'Carton',      'symbol' => 'CTN', 'description' => 'كرتون'],
            ['name' => 'Palette',     'symbol' => 'PLT', 'description' => 'باليطة'],
            ['name' => 'Kilogramme',  'symbol' => 'KG',  'description' => 'كيلوغرام'],
            ['name' => 'Gramme',      'symbol' => 'G',   'description' => 'غرام'],
            ['name' => 'Tonne',       'symbol' => 'T',   'description' => 'طن'],
            ['name' => 'Litre',       'symbol' => 'L',   'description' => 'لتر'],
            ['name' => 'Mètre',       'symbol' => 'M',   'description' => 'متر'],
            ['name' => 'Mètre carré', 'symbol' => 'M²',  'description' => 'متر مربع'],
            ['name' => 'Mètre cube',  'symbol' => 'M³',  'description' => 'متر مكعب'],
        ];

        $order = 1;
        foreach ($units as $unit) {
            // تحقق إن كانت الوحدة موجودة لهذه الشركة تحديداً
            $exists = DB::table('units')
                ->where('company_id', $companyId)
                ->where('name', $unit['name'])
                ->exists();

            if (!$exists) {
                DB::table('units')->insert([
                    'company_id'    => $companyId,
                    'name'          => $unit['name'],
                    'symbol'        => $unit['symbol'],
                    'description'   => $unit['description'],
                    'active'        => true,
                    'display_order' => $order,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            $order++;
        }
    }
}
