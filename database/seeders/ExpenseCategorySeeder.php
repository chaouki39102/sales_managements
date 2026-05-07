<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        if (DB::table('expense_categories')->where('company_id', $companyId)->exists()) {
            return;
        }

        DB::table('expense_categories')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'مصاريف الموظفين',
                'code'          => 'STAFF',
                'description'   => 'رواتب، أجور، تأمينات اجتماعية',
                'parent_id'     => null,
                'active'        => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'مصاريف النقل',
                'code'          => 'TRANS',
                'description'   => 'شحن، نقل بضائع، محروقات',
                'parent_id'     => null,
                'active'        => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'مصاريف إدارية',
                'code'          => 'ADMIN',
                'description'   => 'كهرباء، ماء، هاتف، إيجار',
                'parent_id'     => null,
                'active'        => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'مصاريف تسويق',
                'code'          => 'MRKT',
                'description'   => 'إعلانات، دعاية، عروض ترويجية',
                'parent_id'     => null,
                'active'        => true,
                'display_order' => 4,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}
