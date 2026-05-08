<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $sale     = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'sale')->value('id');
        $purchase = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'purchase')->value('id');
        $transfer = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'transfer')->value('id');

<<<<<<< HEAD
        DB::table('document_types')->upsert([
            // ── مبيعات ──
            ['name' => 'Devis',                   'name_latin' => 'Quote',            'code' => 'DEV', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bon de commande client',  'name_latin' => 'Customer Order',   'code' => 'BCC', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bon de livraison',        'name_latin' => 'Delivery Note',    'code' => 'BL',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Facture de vente',        'name_latin' => 'Sales Invoice',    'code' => 'FV',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'is_printable' => true, 'active' => true, 'display_order' =>  4, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Avoir sur vente',         'name_latin' => 'Sales Credit Note','code' => 'AV',  'document_base_operation_id' => $sale,     'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'is_printable' => true, 'active' => true, 'display_order' =>  5, 'created_at' => now(), 'updated_at' => now()],
            // ── مشتريات ──
            ['name' => 'Demande de prix',         'name_latin' => 'Price Request',    'code' => 'DDP', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  6, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bon de commande fournisseur','name_latin' => 'Supplier Order',  'code' => 'BCF', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  7, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bon de réception',        'name_latin' => 'Goods Received Note','code' => 'BR',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' =>  8, 'created_at' => now(), 'updated_at' => now()],
            ['name' => "Facture d'achat",         'name_latin' => 'Purchase Invoice', 'code' => 'FA',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'is_printable' => true, 'active' => true, 'display_order' =>  9, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Avoir sur achat',         'name_latin' => 'Purchase Debit Note','code' => 'AA', 'document_base_operation_id' => $purchase, 'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'is_printable' => true, 'active' => true, 'display_order' => 10, 'created_at' => now(), 'updated_at' => now()],
            // ── نقل ──
            ['name' => 'Bon de transfert',        'name_latin' => 'Stock Transfer Note','code' => 'BT',  'document_base_operation_id' => $transfer, 'affects_stock_direction' =>  0, 'requires_party' => false, 'affects_accounting' => false, 'is_printable' => true, 'active' => true, 'display_order' => 11, 'created_at' => now(), 'updated_at' => now()],
        ], ['code']);
=======
        $types = [
            // ─── مبيعات ───────────────────────────────────────────────────────
            ['name' => 'Devis',                       'name_latin' => 'Quote',               'code' => 'DEV', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  1],
            ['name' => 'Bon de commande client',      'name_latin' => 'Customer Order',      'code' => 'BCC', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  2],
            ['name' => 'Bon de livraison',            'name_latin' => 'Delivery Note',       'code' => 'BL',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  3],
            ['name' => 'Facture de vente',            'name_latin' => 'Sales Invoice',       'code' => 'FV',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' =>  4],
            ['name' => 'Avoir sur vente',             'name_latin' => 'Sales Credit Note',   'code' => 'AV',  'document_base_operation_id' => $sale,     'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' =>  5],
            // ─── مشتريات ─────────────────────────────────────────────────────
            ['name' => 'Demande de prix',             'name_latin' => 'Price Request',       'code' => 'DDP', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  6],
            ['name' => 'Bon de commande fournisseur', 'name_latin' => 'Supplier Order',      'code' => 'BCF', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  7],
            ['name' => 'Bon de réception',            'name_latin' => 'Goods Received Note', 'code' => 'BR',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  8],
            ['name' => "Facture d'achat",             'name_latin' => 'Purchase Invoice',    'code' => 'FA',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' =>  9],
            ['name' => 'Avoir sur achat',             'name_latin' => 'Purchase Debit Note', 'code' => 'AA',  'document_base_operation_id' => $purchase, 'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' => 10],
            // ─── نقل ─────────────────────────────────────────────────────────
            ['name' => 'Bon de transfert',            'name_latin' => 'Stock Transfer Note', 'code' => 'BT',  'document_base_operation_id' => $transfer, 'affects_stock_direction' =>  0, 'requires_party' => false, 'affects_accounting' => false, 'display_order' => 11],
        ];

        foreach ($types as $type) {
            DB::table('document_types')->insert(array_merge($type, [
                'company_id'   => $companyId,
                'is_printable' => true,
                'active'       => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]));
        }
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}
