<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PriceLevelSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('price_levels')->insert([
            ['company_id' => $companyId, 'name' => 'Tarif Détail',     'description' => 'سعر التجزئة',     'is_default' => true,  'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Demi-Gros',  'description' => 'سعر نصف الجملة',  'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Gros',       'description' => 'سعر الجملة',      'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
