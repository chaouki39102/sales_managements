<?php

namespace Database\Seeders;

use App\Services\Portal\PortalOrderInstaller;
use Illuminate\Database\Seeder;

class DocumentBaseOperationSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? \Illuminate\Support\Facades\DB::table('companies')->value('id');

        if ($companyId) {
            app(PortalOrderInstaller::class)->installForCompany((int) $companyId);
        }
    }
}
