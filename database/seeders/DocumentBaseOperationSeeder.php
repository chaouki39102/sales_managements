<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentBaseOperationSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('document_base_operations')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'sale',
                'label'         => 'مبيعات',
                'description'   => 'عمليات البيع للزبائن',
                'active'     => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'purchase',
                'label'         => 'مشتريات',
                'description'   => 'عمليات الشراء من الموردين',
                'active'     => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'transfer',
                'label'         => 'نقل',
                'description'   => 'نقل المخزون بين المستودعات',
                'active'     => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'adjustment',
                'label'         => 'تعديل',
                'description'   => 'تعديلات المخزون',
                'active'     => true,
                'display_order' => 4,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}
