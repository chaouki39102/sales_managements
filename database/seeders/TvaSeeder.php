<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TvaSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        DB::table('tvas')->upsert([
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('tvas')->insert([
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 0%',
                'rate'          => 0.00,
                'description'   => 'معفى من الضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => false,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 9%',
                'rate'          => 9.00,
                'description'   => 'المعدل المخفض للضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => false,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 19%',
                'rate'          => 19.00,
                'description'   => 'المعدل العادي للضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ], ['name', 'rate']); // unique constraint
    }
}
