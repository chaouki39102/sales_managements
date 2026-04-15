<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = Carbon::now()->year;

        DB::table('fiscal_years')->insert([
            'name' => "Exercice $currentYear",
            'start_date' => "$currentYear-01-01",
            'end_date' => "$currentYear-12-31",
            'is_closed' => false,
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
