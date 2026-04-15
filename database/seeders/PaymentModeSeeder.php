<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    public function run(): void
    {
        $paymentModes = [
            [
                'name' => 'Espèces',
                'code' => 'CASH',
                'description' => 'Paiement en espèces / نقداً',
                'requires_reference' => false,
                'is_cash' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Chèque',
                'code' => 'CHQ',
                'description' => 'Paiement par chèque / شيك',
                'requires_reference' => true,
                'is_cash' => false,
                'display_order' => 2,
            ],
            [
                'name' => 'Virement bancaire',
                'code' => 'WIRE',
                'description' => 'Virement bancaire / تحويل بنكي',
                'requires_reference' => true,
                'is_cash' => false,
                'display_order' => 3,
            ],
            [
                'name' => 'Carte bancaire',
                'code' => 'CARD',
                'description' => 'Paiement par carte bancaire / بطاقة بنكية',
                'requires_reference' => false,
                'is_cash' => false,
                'display_order' => 4,
            ],
            [
                'name' => 'Effet de commerce',
                'code' => 'LCR',
                'description' => 'Lettre de change / سند لأمر',
                'requires_reference' => true,
                'is_cash' => false,
                'display_order' => 5,
            ],
            [
                'name' => 'Versement',
                'code' => 'VERS',
                'description' => 'Versement / إيداع بنكي',
                'requires_reference' => true,
                'is_cash' => false,
                'display_order' => 6,
            ],
        ];

        foreach ($paymentModes as $mode) {
            DB::table('payment_modes')->insert([
                'name' => $mode['name'],
                'code' => $mode['code'],
                'description' => $mode['description'],
                'requires_reference' => $mode['requires_reference'],
                'is_cash' => $mode['is_cash'],
                'active' => true,
                'display_order' => $mode['display_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
