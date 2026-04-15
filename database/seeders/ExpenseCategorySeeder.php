<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 4. ExpenseCategorySeeder (فئات المصاريف)
 * ═══════════════════════════════════════════════════════════════════
 */
class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::table('expense_categories')->insert([
            [
                'name' => 'مصاريف الموظفين',
                'code' => 'STAFF',
                'description' => 'رواتب، أجور، تأمينات اجتماعية',
                'parent_id' => null,
                'active' => true,
                'display_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'مصاريف النقل',
                'code' => 'TRANS',
                'description' => 'شحن، نقل بضائع، محروقات',
                'parent_id' => null,
                'active' => true,
                'display_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'مصاريف إدارية',
                'code' => 'ADMIN',
                'description' => 'كهرباء، ماء، هاتف، إيجار',
                'parent_id' => null,
                'active' => true,
                'display_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'مصاريف تسويق',
                'code' => 'MRKT',
                'description' => 'إعلانات، دعاية، عروض ترويجية',
                'parent_id' => null,
                'active' => true,
                'display_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
