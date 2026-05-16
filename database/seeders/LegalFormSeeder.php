<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegalFormSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        if ($companyId) {
            $this->seedForCompany((int) $companyId);
            return;
        }

        $companies = DB::table('companies')->pluck('id');

        if ($companies->isEmpty()) {
            $this->log('لا توجد شركات في قاعدة البيانات.');
            return;
        }

        foreach ($companies as $id) {
            $this->seedForCompany((int) $id);
        }
    }

    private function seedForCompany(int $companyId): void
    {
        if (DB::table('legal_forms')->where('company_id', $companyId)->exists()) {
            $this->log("الشركة #{$companyId}: موجودة مسبقاً — تم التخطي.");
            return;
        }

        $forms = [
            ['code' => 'EURL',  'name' => 'مؤسسة ذات مسؤولية محدودة بشريك وحيد', 'requires_capital' => true],
            ['code' => 'SARL',  'name' => 'شركة ذات مسؤولية محدودة',               'requires_capital' => true],
            ['code' => 'SPA',   'name' => 'شركة المساهمة',                          'requires_capital' => true],
            ['code' => 'SNC',   'name' => 'شركة التضامن',                           'requires_capital' => false],
            ['code' => 'SCS',   'name' => 'شركة التوصية البسيطة',                  'requires_capital' => false],
            ['code' => 'SCA',   'name' => 'شركة التوصية بالأسهم',                  'requires_capital' => true],
            ['code' => 'EPE',   'name' => 'مؤسسة عمومية اقتصادية',                 'requires_capital' => true],
            ['code' => 'PE',    'name' => 'مؤسسة فردية',                           'requires_capital' => false],
            ['code' => 'COOP',  'name' => 'تعاونية',                                'requires_capital' => false],
            ['code' => 'ASSOC', 'name' => 'جمعية',                                  'requires_capital' => false],
            ['code' => 'OTHER', 'name' => 'أخرى',                                   'requires_capital' => false],
        ];

        $now  = now();
        $data = array_map(fn($f) => [
            'company_id'       => $companyId,
            'code'             => $f['code'],
            'name'             => $f['name'],
            'requires_capital' => $f['requires_capital'],
            'active'           => true,
            'created_at'       => $now,
            'updated_at'       => $now,
        ], $forms);

        DB::table('legal_forms')->insert($data);

        $this->log("الشركة #{$companyId}: تم إدراج " . count($data) . ' شكل قانوني.');
    }

    private function log(string $msg): void
    {
        if (isset($this->command) && $this->command !== null) {
            $this->command->info($msg);
        }
    }
}
