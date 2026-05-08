<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NumberingSeriesSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        // لا نُدرج إن كانت سلاسل الترقيم موجودة لهذه الشركة
        if (DB::table('numbering_series')->where('company_id', $companyId)->exists()) {
            return;
        }

        // المستودع الخاص بهذه الشركة — يجب تشغيل WarehouseSeeder أولاً
        $warehouseId = DB::table('warehouses')
            ->where('company_id', $companyId)
            ->value('id');

        if (!$warehouseId) {
            throw new \RuntimeException('لا يوجد مستودع للشركة ' . $companyId . ' — شغّل WarehouseSeeder أولاً');
        }

        $year = date('Y');
        $documentTypes = DB::table('document_types')->get();
=======
        $companyId   = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->value('id');
        $year        = date('Y');

        $documentTypes = DB::table('document_types')->where('company_id', $companyId)->get();
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

        $rows = [];
        foreach ($documentTypes as $docType) {
            $rows[] = [
                'company_id'       => $companyId,
                'document_type_id' => $docType->id,
                'warehouse_id'     => $warehouseId,
                'prefix'           => $docType->code,
                'suffix'           => null,
                'format'           => '{PREFIX}/{YY}/{NUMBER:6}',
                'last_number'      => 0,
                'start_number'     => 1,
                'padding'          => 6,
                'reset_yearly'     => true,
                'reset_monthly'    => false,
                'current_year'     => $year,
                'active'           => true,
                'is_locked'        => false,
                'created_at'       => now(),
                'updated_at'       => now(),
            ];
        }

        if (!empty($rows)) {
            DB::table('numbering_series')->insert($rows);
        }
    }
}
