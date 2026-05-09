<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FiscalStampSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $stamps = [
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 100 DA',
                'min_amount'   => 0.00,
                'max_amount'   => 1000.00,
                'stamp_value'  => 100.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 300 DA',
                'min_amount'   => 1000.01,
                'max_amount'   => 5000.00,
                'stamp_value'  => 300.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 1000 DA',
                'min_amount'   => 5000.01,
                'max_amount'   => null,
                'stamp_value'  => 1000.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ];

        foreach ($stamps as $stamp) {
            // تجنب التكرار: إدراج فقط إن لم تكن موجودة
            DB::table('fiscal_stamps')->updateOrInsert(
                ['company_id' => $stamp['company_id'], 'name' => $stamp['name']],
                $stamp
            );
        }
    }
}
