<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PriceLevelSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        // لا نُدرج إن كانت مستويات الأسعار موجودة مسبقاً لهذه الشركة
        if (DB::table('price_levels')->where('company_id', $companyId)->exists()) {
            return;
        }

        DB::table('price_levels')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'Prix de détail',
                'description'   => 'سعر التجزئة',
                'is_default'    => true,
                'active'        => true,
                'display_order' => 1,
                'is_percentage' => false,
                'value'         => null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'Prix de gros',
                'description'   => 'سعر الجملة',
                'is_default'    => false,
                'active'        => true,
                'display_order' => 2,
                'is_percentage' => true,
                'value'         => -10.00,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'Prix semi-gros',
                'description'   => 'سعر نصف الجملة',
                'is_default'    => false,
                'active'        => true,
                'display_order' => 3,
                'is_percentage' => true,
                'value'         => -20.00,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'Prix spécial',
                'description'   => 'سعر خاص',
                'is_default'    => false,
                'active'        => true,
                'display_order' => 4,
                'is_percentage' => false,
                'value'         => null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('price_levels')->insert([
            ['company_id' => $companyId, 'name' => 'Tarif Détail',     'description' => 'سعر التجزئة',     'is_default' => true,  'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Demi-Gros',  'description' => 'سعر نصف الجملة',  'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Gros',       'description' => 'سعر الجملة',      'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        ]);
    }
}
