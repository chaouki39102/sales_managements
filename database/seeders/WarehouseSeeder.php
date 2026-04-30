<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = DB::table('companies')->first()->id;
        $wilayaId  = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي

        DB::table('warehouses')->insert([
            'company_id'   => $companyId,
            'name'         => 'Dépôt Principal',
            'code'         => 'DP01',
            'address'      => 'Cité 08 Mai, Eloued',
            'wilaya_id'    => $wilayaId,
            'phone'        => '029123456',
            'manager_name' => 'ABDESSADOK',
            'activity'     => 'Stockage et distribution',
            'active'       => true,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }
}
