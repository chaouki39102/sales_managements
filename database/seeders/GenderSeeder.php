<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GenderSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('genders')->insert([
            [
                'name'          => 'male',
                'label'         => 'ذكر',
                'active'        => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'name'          => 'female',
                'label'         => 'أنثى',
                'active'        => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}
