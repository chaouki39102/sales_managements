<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StockMovementTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('stock_movement_types')->insert([
            ['company_id' => $companyId, 'name' => 'in', 'label' => 'وارد', 'description' => 'دخول المخزون', 'direction' => 1, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'out', 'label' => 'صادر', 'description' => 'خروج المخزون', 'direction' => -1, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'adjustment', 'label' => 'تسوية', 'description' => 'تسوية يدوية', 'direction' => 0, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
