<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = Carbon::now()->year;
        $companyId   = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('fiscal_years')->insert([
            'company_id' => $companyId,
            'name'       => "Exercice $currentYear",
            'start_date' => "$currentYear-01-01",
            'end_date'   => "$currentYear-12-31",
            'is_closed'  => false,
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
