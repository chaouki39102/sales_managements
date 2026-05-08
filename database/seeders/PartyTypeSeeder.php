<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PartyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('party_types')->insert([
            ['company_id' => $companyId, 'name' => 'client', 'label' => 'زبون', 'description' => 'زبون', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'supplier', 'label' => 'ممون', 'description' => 'ممون', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'both', 'label' => 'زبون وممون', 'description' => 'زبون وممون في آن واحد', 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
