<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['key' => 'free',         'label' => 'مجاني',    'description' => 'خطة مجانية للأفراد',              'max_users' => 1,   'max_products' => 100,   'max_warehouses' => 1,  'sort_order' => 1],
            ['key' => 'starter',      'label' => 'مبتدئ',    'description' => 'خطة للشركات الناشئة',             'max_users' => 5,   'max_products' => 500,   'max_warehouses' => 1,  'sort_order' => 2],
            ['key' => 'professional', 'label' => 'احترافي',  'description' => 'خطة للشركات المتوسطة',           'max_users' => 15,  'max_products' => 5000,  'max_warehouses' => 5,  'sort_order' => 3],
            ['key' => 'enterprise',   'label' => 'مؤسسة',    'description' => 'خطة للشركات الكبيرة',            'max_users' => 50,  'max_products' => 0,     'max_warehouses' => 20, 'sort_order' => 4],
            ['key' => 'custom',       'label' => 'مخصص',     'description' => 'خطة مخصصة بحدود مرنة',           'max_users' => 0,   'max_products' => 0,     'max_warehouses' => 0,  'sort_order' => 5],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['key' => $plan['key']], $plan);
        }
    }
}
