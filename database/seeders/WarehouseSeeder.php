<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        // لا نُدرج إن كان مستودع موجود لهذه الشركة
        if (DB::table('warehouses')->where('company_id', $companyId)->exists()) {
            return;
        }

        // الولاية اختيارية — لا نوقف التنفيذ إن لم توجد
        $wilayaId = DB::table('wilayas')->where('code', 39)->value('id');

        DB::table('warehouses')->insert([
            'company_id'   => $companyId,
            'name'         => 'Dépôt Principal',
            'code'         => 'DP01',
            'address'      => 'Cité 08 Mai, Eloued',
            'wilaya_id'    => $wilayaId ?? null,
            'phone'        => '029123456',
            'manager_name' => 'ABDESSADOK',
            'activity'     => 'Stockage et distribution',
            'active'       => true,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }
}
