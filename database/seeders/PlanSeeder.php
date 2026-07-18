<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['key' => 'free',         'label' => 'مجاني',   'description' => 'خطة مجانية للأفراد والمشاريع الصغيرة',   'max_users' => 3,   'max_products' => 500,   'max_warehouses' => 1,  'sort_order' => 1],
            ['key' => 'starter',      'label' => 'مبتدئ',   'description' => 'خطة للشركات الناشئة',                   'max_users' => 10,  'max_products' => 2000,  'max_warehouses' => 2,  'sort_order' => 2],
            ['key' => 'professional', 'label' => 'احترافي', 'description' => 'خطة للشركات المتوسطة والكبيرة',         'max_users' => 25,  'max_products' => 10000, 'max_warehouses' => 5,  'sort_order' => 3],
            ['key' => 'enterprise',   'label' => 'مؤسسة',   'description' => 'خطة للمؤسسات الكبيرة — حدود عالية جداً', 'max_users' => 999, 'max_products' => 999999,'max_warehouses' => 99, 'sort_order' => 4],
            ['key' => 'custom',       'label' => 'مخصص',    'description' => 'خطة مخصصة بحدود مرنة حسب الطلب',        'max_users' => 0,   'max_products' => 0,     'max_warehouses' => 0,  'sort_order' => 5],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['key' => $plan['key']], $plan);
        }
    }
}
