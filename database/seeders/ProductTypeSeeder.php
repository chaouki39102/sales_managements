<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('product_types')->insert([
            ['company_id' => $companyId, 'name' => 'stockable', 'label' => 'مخزون', 'description' => 'منتج مادي يدار له المخزون', 'manages_stock' => true, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'service', 'label' => 'خدمة', 'description' => 'خدمة غير مادية', 'manages_stock' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'consumable', 'label' => 'مستهلك', 'description' => 'مستلزمات مستهلكة ', 'manages_stock' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
