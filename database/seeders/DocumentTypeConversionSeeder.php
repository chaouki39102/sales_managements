<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentTypeConversionSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $conversions = [
            // ─── سلسلة المبيعات ───────────────────────────────────
            ['source_code' => 'DEV', 'target_code' => 'BCC', 'display_order' => 1],
            ['source_code' => 'DEV', 'target_code' => 'BL',  'display_order' => 2],
            ['source_code' => 'DEV', 'target_code' => 'FV',  'display_order' => 3],
            ['source_code' => 'BCC', 'target_code' => 'BL',  'display_order' => 1],
            ['source_code' => 'BCC', 'target_code' => 'FV',  'display_order' => 2],
            ['source_code' => 'BL',  'target_code' => 'FV',  'display_order' => 1],
            ['source_code' => 'FV',  'target_code' => 'AV',  'display_order' => 1], // فاتورة → إشعار دائن
            ['source_code' => 'AV',  'target_code' => 'FV',  'display_order' => 1], // إشعار دائن → فاتورة (عكس)
            // ─── سلسلة المشتريات ─────────────────────────────────
            ['source_code' => 'DDP', 'target_code' => 'BCF', 'display_order' => 1],
            ['source_code' => 'BCF', 'target_code' => 'BR',  'display_order' => 1],
            ['source_code' => 'BCF', 'target_code' => 'FA',  'display_order' => 2],
            ['source_code' => 'BR',  'target_code' => 'FA',  'display_order' => 1],
            ['source_code' => 'FA',  'target_code' => 'AA',  'display_order' => 1], // فاتورة شراء → إشعار مدين
            ['source_code' => 'AA',  'target_code' => 'FA',  'display_order' => 1], // إشعار مدين → فاتورة شراء (عكس)
        ];

        $rows = array_map(fn($row) => [
            ...$row,
            'company_id'  => $companyId,
            'created_at'  => now(),
            'updated_at'  => now(),
        ], $conversions);

        DB::table('document_type_conversions')->insert($rows);
    }
}
