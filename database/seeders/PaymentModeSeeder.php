<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        if (!$companyId) {
            throw new \RuntimeException('seeding.company_id غير محدد');
        }

        // لا نُدرج إن كانت طرق الدفع موجودة لهذه الشركة
        if (DB::table('payment_modes')->where('company_id', $companyId)->exists()) {
            return;
        }

        // الصندوق الرئيسي — مرتبط بالشركة الحالية تحديداً
        $cashAccountId = DB::table('treasury_accounts')
            ->where('company_id', $companyId)
            ->where('code', 'CASH01')
            ->value('id');

        DB::table('payment_modes')->insert([
            ['company_id' => $companyId, 'name' => 'Espèces',           'code' => 'CASH', 'description' => 'نقداً',       'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Chèque',            'code' => 'CHQ',  'description' => 'شيك',         'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Virement bancaire', 'code' => 'WIRE', 'description' => 'تحويل بنكي',  'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Carte bancaire',    'code' => 'CARD', 'description' => 'بطاقة بنكية', 'treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Effet de commerce', 'code' => 'LCR',  'description' => 'سند لأمر',    'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Versement',         'code' => 'VERS', 'description' => 'إيداع بنكي',  'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 6, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
