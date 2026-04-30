<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NumberingSeriesSeeder extends Seeder
{
    public function run(): void
    {
        $companyId   = DB::table('companies')->first()->id;
        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->first()->id;
        $year        = date('Y');

        $documentTypes = DB::table('document_types')->get();

        foreach ($documentTypes as $docType) {
            DB::table('numbering_series')->insert([
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
            ]);
        }
    }
}
