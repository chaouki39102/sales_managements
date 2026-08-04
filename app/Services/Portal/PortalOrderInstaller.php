<?php

namespace App\Services\Portal;

use Illuminate\Support\Facades\DB;

/**
 * PortalOrderInstaller — مصدر الحقيقة الوحيد للبيانات المرجعية لأنواع المستندات.
 *
 * يضمن لكل مؤسسة (بطريقة idempotent عبر updateOrInsert على القيود الفريدة):
 *   - عمليات السند الأساسية (sale/purchase/transfer/adjustment)
 *   - حالات المستندات (draft/pending/validated/...)
 *   - أنواع المستندات (13 نوعاً — منها CMD "أمر زبون" للبوابة)
 *   - التحويلات المسموحة (بما فيها CMD → FV / CMD → POS)
 *
 * استُخدم من seeders المختصة ومن الأمر console 'portal-orders:install'
 * لتثبيت CMD في المؤسسات الموجودة مسبقاً دون إعادة البذر الكامل.
 */
class PortalOrderInstaller
{
    public function installForCompany(int $companyId): void
    {
        $this->ensureBaseOperations($companyId);
        $this->ensureStatuses($companyId);
        $this->ensureDocumentTypes($companyId);
        $this->ensureConversions($companyId);
    }

    public function installAll(): int
    {
        $count = 0;
        foreach (DB::table('companies')->pluck('id') as $companyId) {
            $this->installForCompany((int) $companyId);
            $count++;
        }
        return $count;
    }

    private function ensureBaseOperations(int $companyId): void
    {
        $operations = [
            ['name' => 'sale',       'label' => 'مبيعات',     'description' => 'عمليات البيع للزبائن',            'display_order' => 1],
            ['name' => 'purchase',   'label' => 'مشتريات',    'description' => 'عمليات الشراء من الموردين',       'display_order' => 2],
            ['name' => 'transfer',   'label' => 'نقل',        'description' => 'نقل المخزون بين المستودعات',      'display_order' => 3],
            ['name' => 'adjustment', 'label' => 'تعديل',      'description' => 'تعديلات المخزون',                 'display_order' => 4],
        ];

        foreach ($operations as $op) {
            DB::table('document_base_operations')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $op['name']],
                [...$op, 'company_id' => $companyId, 'active' => true, 'updated_at' => now()],
            );
        }
    }

    private function ensureStatuses(int $companyId): void
    {
        $statuses = [
            ['name' => 'draft',          'label' => 'مسودة',        'color' => 'gray'],
            ['name' => 'pending',        'label' => 'قيد الانتظار', 'color' => 'yellow'],
            ['name' => 'validated',      'label' => 'معتمد',        'color' => 'blue'],
            ['name' => 'partially_paid', 'label' => 'مدفوع جزئياً', 'color' => 'orange'],
            ['name' => 'paid',           'label' => 'مدفوع',        'color' => 'green'],
            ['name' => 'overdue',        'label' => 'متأخر',        'color' => 'red'],
            ['name' => 'cancelled',      'label' => 'ملغي',         'color' => 'red'],
            ['name' => 'returned',       'label' => 'مرتجع',        'color' => 'purple'],
        ];

        foreach ($statuses as $status) {
            DB::table('document_statuses')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $status['name']],
                [...$status, 'company_id' => $companyId, 'active' => true, 'updated_at' => now()],
            );
        }
    }

    private function ensureDocumentTypes(int $companyId): void
    {
        $opId = fn(string $name) => DB::table('document_base_operations')
            ->where('company_id', $companyId)->where('name', $name)->value('id');

        $sale     = $opId('sale');
        $purchase = $opId('purchase');
        $transfer = $opId('transfer');

        if (!$sale || !$purchase || !$transfer) {
            return;
        }

        $types = [
            // ─── مبيعات ───────────────────────────────────────────────────────
            ['name' => 'Devis',                       'name_latin' => 'Quote',               'code' => 'DEV', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  1],
            ['name' => 'Bon de commande client',      'name_latin' => 'Customer Order',      'code' => 'BCC', 'document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  2],
            ['name' => 'Bon de livraison',            'name_latin' => 'Delivery Note',       'code' => 'BL',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  3],
            ['name' => 'Facture de vente',            'name_latin' => 'Sales Invoice',       'code' => 'FV',  'document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' =>  4],
            ['name' => 'Avoir sur vente',             'name_latin' => 'Sales Credit Note',   'code' => 'AV',  'document_base_operation_id' => $sale,     'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' =>  5],
            // ─── بوابة الزبائن ────────────────────────────────────────────────
            ['name' => 'أمر زبون',                     'name_latin' => 'Portal Customer Order','code' => 'CMD','document_base_operation_id' => $sale,     'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  6, 'description' => 'طلبات بوابة الزبائن'],
            // ─── مشتريات ─────────────────────────────────────────────────────
            ['name' => 'Demande de prix',             'name_latin' => 'Price Request',       'code' => 'DDP', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  7],
            ['name' => 'Bon de commande fournisseur', 'name_latin' => 'Supplier Order',      'code' => 'BCF', 'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  0, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  8],
            ['name' => 'Bon de réception',            'name_latin' => 'Goods Received Note', 'code' => 'BR',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => false, 'display_order' =>  9],
            ['name' => "Facture d'achat",             'name_latin' => 'Purchase Invoice',    'code' => 'FA',  'document_base_operation_id' => $purchase, 'affects_stock_direction' =>  1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' => 10],
            ['name' => 'Avoir sur achat',             'name_latin' => 'Purchase Debit Note', 'code' => 'AA',  'document_base_operation_id' => $purchase, 'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' => 11],
            // ─── نقاط بيع ──────────────────────────────────────────────────
            ['name' => 'مبيعات POS',                   'name_latin' => 'POS Sales',            'code' => 'POS','document_base_operation_id' => $sale,     'affects_stock_direction' => -1, 'requires_party' => true,  'affects_accounting' => true,  'display_order' => 13, 'description' => 'فواتير مبيعات نقطة البيع POS'],
            // ─── نقل ─────────────────────────────────────────────────────────
            ['name' => 'Bon de transfert',            'name_latin' => 'Stock Transfer Note', 'code' => 'BT',  'document_base_operation_id' => $transfer, 'affects_stock_direction' =>  0, 'requires_party' => false, 'affects_accounting' => false, 'display_order' => 14],
        ];

        foreach ($types as $type) {
            DB::table('document_types')->updateOrInsert(
                ['company_id' => $companyId, 'code' => $type['code']],
                [...$type, 'company_id' => $companyId, 'is_printable' => true, 'active' => true, 'updated_at' => now()],
            );
        }
    }

    private function ensureConversions(int $companyId): void
    {
        $conversions = [
            // ─── سلسلة المبيعات ───────────────────────────────────
            ['source_code' => 'DEV', 'target_code' => 'BCC', 'display_order' => 1],
            ['source_code' => 'DEV', 'target_code' => 'BL',  'display_order' => 2],
            ['source_code' => 'DEV', 'target_code' => 'FV',  'display_order' => 3],
            ['source_code' => 'BCC', 'target_code' => 'BL',  'display_order' => 1],
            ['source_code' => 'BCC', 'target_code' => 'FV',  'display_order' => 2],
            ['source_code' => 'BL',  'target_code' => 'FV',  'display_order' => 1],
            ['source_code' => 'FV',  'target_code' => 'AV',  'display_order' => 1], // فاتورة → إشعار دائن
            ['source_code' => 'AV',  'target_code' => 'FV',  'display_order' => 1], // إشعار دائن → فاتورة (عكس)
            // ─── بوابة الزبائن ────────────────────────────────────
            ['source_code' => 'CMD', 'target_code' => 'FV',  'display_order' => 1], // أمر زبون → فاتورة بيع
            ['source_code' => 'CMD', 'target_code' => 'POS', 'display_order' => 2], // أمر زبون → فاتورة POS
            // ─── سلسلة المشتريات ─────────────────────────────────
            ['source_code' => 'DDP', 'target_code' => 'BCF', 'display_order' => 1],
            ['source_code' => 'BCF', 'target_code' => 'BR',  'display_order' => 1],
            ['source_code' => 'BCF', 'target_code' => 'FA',  'display_order' => 2],
            ['source_code' => 'BR',  'target_code' => 'FA',  'display_order' => 1],
            ['source_code' => 'FA',  'target_code' => 'AA',  'display_order' => 1], // فاتورة شراء → إشعار مدين
            ['source_code' => 'AA',  'target_code' => 'FA',  'display_order' => 1], // إشعار شراء → فاتورة (عكس)
        ];

        foreach ($conversions as $conv) {
            DB::table('document_type_conversions')->updateOrInsert(
                ['company_id' => $companyId, 'source_code' => $conv['source_code'], 'target_code' => $conv['target_code']],
                [...$conv, 'company_id' => $companyId, 'updated_at' => now()],
            );
        }
    }
}
