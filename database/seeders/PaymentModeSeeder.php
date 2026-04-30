<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    public function run(): void
    {
        // الصندوق الرئيسي — لربط وسيلة الدفع نقداً
        $cashAccountId = DB::table('treasury_accounts')->where('code', 'CASH01')->value('id');

        DB::table('payment_modes')->insert([
            ['name' => 'Espèces',          'code' => 'CASH', 'description' => 'نقداً',          'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Chèque',           'code' => 'CHQ',  'description' => 'شيك',            'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Virement bancaire','code' => 'WIRE', 'description' => 'تحويل بنكي',     'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Carte bancaire',   'code' => 'CARD', 'description' => 'بطاقة بنكية',    'treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Effet de commerce','code' => 'LCR',  'description' => 'سند لأمر',       'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Versement',        'code' => 'VERS', 'description' => 'إيداع بنكي',     'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 6, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
