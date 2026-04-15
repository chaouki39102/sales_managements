<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $saleOperationId = DB::table('document_base_operations')->where('name', 'sale')->value('id');
        $purchaseOperationId = DB::table('document_base_operations')->where('name', 'purchase')->value('id');
        $transferOperationId = DB::table('document_base_operations')->where('name', 'transfer')->value('id');

        $documentTypes = [
            // Sales Documents
            [
                'name' => 'Devis',
                'name_latin' => 'Quote',
                'code' => 'DEV',
                'description' => 'عرض أسعار',
                'document_base_operation_id' => $saleOperationId,
                'affects_stock_direction' => 0,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Bon de commande client',
                'name_latin' => 'Customer Order',
                'code' => 'BCC',
                'description' => 'أمر شراء من العميل',
                'document_base_operation_id' => $saleOperationId,
                'affects_stock_direction' => 0,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 2,
            ],
            [
                'name' => 'Bon de livraison',
                'name_latin' => 'Delivery Note',
                'code' => 'BL',
                'description' => 'وصل تسليم',
                'document_base_operation_id' => $saleOperationId,
                'affects_stock_direction' => -1,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 3,
            ],
            [
                'name' => 'Facture de vente',
                'name_latin' => 'Sales Invoice',
                'code' => 'FV',
                'description' => 'فاتورة بيع',
                'document_base_operation_id' => $saleOperationId,
                'affects_stock_direction' => -1,
                'requires_party' => true,
                'affects_accounting' => true,
                'is_printable' => true,
                'display_order' => 4,
            ],
            [
                'name' => 'Avoir sur vente',
                'name_latin' => 'Sales Credit Note',
                'code' => 'AV',
                'description' => 'إشعار دائن - مرتجع بيع',
                'document_base_operation_id' => $saleOperationId,
                'affects_stock_direction' => 1,
                'requires_party' => true,
                'affects_accounting' => true,
                'is_printable' => true,
                'display_order' => 5,
            ],

            // Purchase Documents
            [
                'name' => 'Demande de prix',
                'name_latin' => 'Price Request',
                'code' => 'DDP',
                'description' => 'طلب عرض أسعار',
                'document_base_operation_id' => $purchaseOperationId,
                'affects_stock_direction' => 0,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 6,
            ],
            [
                'name' => 'Bon de commande fournisseur',
                'name_latin' => 'Supplier Order',
                'code' => 'BCF',
                'description' => 'أمر شراء للمورد',
                'document_base_operation_id' => $purchaseOperationId,
                'affects_stock_direction' => 0,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 7,
            ],
            [
                'name' => 'Bon de réception',
                'name_latin' => 'Goods Received Note',
                'code' => 'BR',
                'description' => 'وصل استلام',
                'document_base_operation_id' => $purchaseOperationId,
                'affects_stock_direction' => 1,
                'requires_party' => true,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 8,
            ],
            [
                'name' => 'Facture d\'achat',
                'name_latin' => 'Purchase Invoice',
                'code' => 'FA',
                'description' => 'فاتورة شراء',
                'document_base_operation_id' => $purchaseOperationId,
                'affects_stock_direction' => 1,
                'requires_party' => true,
                'affects_accounting' => true,
                'is_printable' => true,
                'display_order' => 9,
            ],
            [
                'name' => 'Avoir sur achat',
                'name_latin' => 'Purchase Debit Note',
                'code' => 'AA',
                'description' => 'إشعار مدين - مرتجع شراء',
                'document_base_operation_id' => $purchaseOperationId,
                'affects_stock_direction' => -1,
                'requires_party' => true,
                'affects_accounting' => true,
                'is_printable' => true,
                'display_order' => 10,
            ],

            // Transfer Documents
            [
                'name' => 'Bon de transfert',
                'name_latin' => 'Stock Transfer Note',
                'code' => 'BT',
                'description' => 'وصل نقل بين المستودعات',
                'document_base_operation_id' => $transferOperationId,
                'affects_stock_direction' => 0,
                'requires_party' => false,
                'affects_accounting' => false,
                'is_printable' => true,
                'display_order' => 11,
            ],
        ];

        foreach ($documentTypes as $type) {
            DB::table('document_types')->insert([
                'name' => $type['name'],
                'name_latin' => $type['name_latin'],
                'code' => $type['code'],
                'description' => $type['description'],
                'document_base_operation_id' => $type['document_base_operation_id'],
                'affects_stock_direction' => $type['affects_stock_direction'],
                'requires_party' => $type['requires_party'],
                'affects_accounting' => $type['affects_accounting'],
                'is_printable' => $type['is_printable'],
                'active' => true,
                'display_order' => $type['display_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
