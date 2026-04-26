<?php

// دمج تلقائي لكل ملفات الـ seeders



// ===== ملف: CurrencySeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        DB::table('currencies')->insert([
            [
                'name' => 'Dinar Algérien',
                'code' => 'DZD',
                'symbol' => 'د.ج',
                'decimal_places' => 2,
                'is_base_currency' => true,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Euro',
                'code' => 'EUR',
                'symbol' => '€',
                'decimal_places' => 2,
                'is_base_currency' => false,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'US Dollar',
                'code' => 'USD',
                'symbol' => '$',
                'decimal_places' => 2,
                'is_base_currency' => false,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: DatabaseSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * نقطة البداية لتشغيل جميع الـ Seeders بالترتيب الصحيح
     *
     * الترتيب مهم جداً! الجداول المستقلة أولاً، ثم الجداول التابعة
     */
    public function run(): void
    {
        // ═════════════════════════════════════════════════════════════
        // المرحلة 1: جداول Lookup المستقلة (لا تعتمد على أي جدول آخر)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            GenderSeeder::class,
            CurrencySeeder::class,
            TvaSeeder::class,
            UnitSeeder::class,
            LegalFormSeeder::class,
            FiscalStampSeeder::class,
            InventoryValuationMethodSeeder::class,
            DocumentBaseOperationSeeder::class,
            ExpenseCategorySeeder::class, // اختياري
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 2: البيانات الجغرافية (الولايات والبلديات)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            WilayaCommuneSeeder::class, // يدخل الولايات ثم البلديات
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 3: الأدوار والصلاحيات والمستخدمين
        // ═════════════════════════════════════════════════════════════
        $this->call([
            RolesAndPermissionsSeeder::class,
            UserSeeder::class, // يعتمد على Roles
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 4: السنة المالية (مطلوبة للمستندات)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            FiscalYearSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 5: المستودعات (يعتمد على Wilayas)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            WarehouseSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 6: أنواع المستندات (يعتمد على DocumentBaseOperations)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            DocumentTypeSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 7: سلاسل الترقيم (يعتمد على DocumentTypes + Warehouses)
        // ═════════════════════════════════════════════════════════════
        $this->call([
            NumberingSeriesSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 8: مستويات الأسعار
        // ═════════════════════════════════════════════════════════════
        $this->call([
            PriceLevelSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 9: الخزينة والحسابات المالية
        // ═════════════════════════════════════════════════════════════
        $this->call([
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ═════════════════════════════════════════════════════════════
        // المرحلة 10: الأطراف (اختياري - يمكن تركه فارغاً للـ MVP)
        // ═════════════════════════════════════════════════════════════
        // $this->call([
        //     PartierSeeder::class, // غير مطلوب للـ MVP
        // ]);
    }
}




// ===== ملف: DocumentBaseOperationSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 1. DocumentBaseOperationSeeder
 * ═══════════════════════════════════════════════════════════════════
 * يجب تشغيله قبل DocumentTypeSeeder
 */
class DocumentBaseOperationSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('document_base_operations')->insert([
            [
                'name' => 'sale',
                'label' => 'مبيعات',
                'description' => 'عمليات البيع للعملاء',
                'active' => true,
                'display_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'purchase',
                'label' => 'مشتريات',
                'description' => 'عمليات الشراء من الموردين',
                'active' => true,
                'display_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'transfer',
                'label' => 'نقل',
                'description' => 'نقل المخزون بين المستودعات',
                'active' => true,
                'display_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'adjustment',
                'label' => 'تعديل',
                'description' => 'تعديلات المخزون',
                'active' => true,
                'display_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: DocumentStatusSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            [
                'name' => 'draft',
                'label' => 'مسودة',
                'color' => 'gray',
            ],
            [
                'name' => 'pending',
                'label' => 'قيد الانتظار',
                'color' => 'yellow',
            ],
            [
                'name' => 'validated',
                'label' => 'معتمد',
                'color' => 'blue',
            ],
            [
                'name' => 'partially_paid',
                'label' => 'مدفوع جزئياً',
                'color' => 'orange',
            ],
            [
                'name' => 'paid',
                'label' => 'مدفوع',
                'color' => 'green',
            ],
            [
                'name' => 'overdue',
                'label' => 'متأخر',
                'color' => 'red',
            ],
            [
                'name' => 'cancelled',
                'label' => 'ملغي',
                'color' => 'red',
            ],
            [
                'name' => 'returned',
                'label' => 'مرتجع',
                'color' => 'purple',
            ],
        ];

        foreach ($statuses as $status) {
            DB::table('document_statuses')->insert([
                'name' => $status['name'],
                'label' => $status['label'],
                'color' => $status['color'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}




// ===== ملف: DocumentTypeSeeder.php =====
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
                'description' => 'أمر شراء من الزبون',
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




// ===== ملف: ExpenseCategorySeeder.php =====
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




// ===== ملف: FiscalStampSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FiscalStampSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('fiscal_stamps')->insert([
            [
                'name' => 'Timbre 100 DA',
                'min_amount' => 0.00,
                'max_amount' => 1000.00,
                'stamp_value' => 100.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Timbre 300 DA',
                'min_amount' => 1000.01,
                'max_amount' => 5000.00,
                'stamp_value' => 300.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Timbre 1000 DA',
                'min_amount' => 5000.01,
                'max_amount' => null,
                'stamp_value' => 1000.00,
                'type' => 'fixed',
                'active' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: FiscalYearSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = Carbon::now()->year;

        DB::table('fiscal_years')->insert([
            'name' => "Exercice $currentYear",
            'start_date' => "$currentYear-01-01",
            'end_date' => "$currentYear-12-31",
            'is_closed' => false,
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}




// ===== ملف: GenderSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GenderSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('genders')->insert([
            [
                'name' => 'male',
                'label' => 'ذكر',
                'active' => true,
                'display_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'female',
                'label' => 'أنثى',
                'active' => true,
                'display_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: InventoryValuationMethodSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 2. InventoryValuationMethodSeeder
 * ═══════════════════════════════════════════════════════════════════
 * مطلوب لجدول product_variants
 */
class InventoryValuationMethodSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('inventory_valuation_methods')->insert([
            [
                'name' => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method' => 'fifo',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method' => 'lifo',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'المتوسط المرجح',
                'method' => 'weighted_average',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: LegalFormSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegalFormSeeder extends Seeder
{
    public function run(): void
    {
        $legalForms = [
            [
                'code' => 'SARL',
                'name' => 'Société à Responsabilité Limitée - شركة ذات مسؤولية محدودة',
                'description' => 'الشكل القانوني الأكثر شيوعاً في الجزائر',
                'requires_capital' => true,
                'active' => true,
            ],
            [
                'code' => 'EURL',
                'name' => 'Entreprise Unipersonnelle à Responsabilité Limitée - مؤسسة فردية ذات مسؤولية محدودة',
                'description' => 'شركة فردية بشريك واحد',
                'requires_capital' => true,
                'active' => true,
            ],
            [
                'code' => 'SPA',
                'name' => 'Société Par Actions - شركة المساهمة',
                'description' => 'شركة مساهمة كبيرة',
                'requires_capital' => true,
                'active' => true,
            ],
            [
                'code' => 'SNC',
                'name' => 'Société en Nom Collectif - شركة التضامن',
                'description' => 'جميع الشركاء متضامنون',
                'requires_capital' => true,
                'active' => true,
            ],
            [
                'code' => 'SCS',
                'name' => 'Société en Commandite Simple - شركة التوصية البسيطة',
                'description' => 'شركاء متضامنون وموصون',
                'requires_capital' => true,
                'active' => true,
            ],
            [
                'code' => 'EI',
                'name' => 'Entreprise Individuelle - مؤسسة فردية',
                'description' => 'مؤسسة فردية بدون شخصية معنوية',
                'requires_capital' => false,
                'active' => true,
            ],
        ];

        foreach ($legalForms as $form) {
            DB::table('legal_forms')->insert([
                'code' => $form['code'],
                'name' => $form['name'],
                'description' => $form['description'],
                'requires_capital' => $form['requires_capital'],
                'active' => $form['active'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}




// ===== ملف: NumberingSeriesSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NumberingSeriesSeeder extends Seeder
{
    public function run(): void
    {
        $documentTypes = DB::table('document_types')->get();
        $warehouseId = DB::table('warehouses')->first()->id;
        $year = date('Y');

        foreach ($documentTypes as $docType) {
            DB::table('numbering_series')->insert([
                'document_type_id' => $docType->id,
                'warehouse_id' => $warehouseId,
                'prefix' => $docType->code,
                'suffix' => null,
                'format' => '{PREFIX}/{YY}/{NUMBER:6}',
                'last_number' => 0,
                'start_number' => 1,
                'padding' => 6,
                'reset_yearly' => true,
                'reset_monthly' => false,
                'current_year' => $year,
                'active' => true,
                'is_locked' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}




// ===== ملف: PartierSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PartierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
    }
}




// ===== ملف: PaymentModeSeeder.php =====
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




// ===== ملف: PriceLevelSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PriceLevelSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('price_levels')->insert([
            [
                'name' => 'Prix de détail',
                'description' => 'سعر التجزئة',
                'is_percentage' => false,
                'value' => 0.00,
                'active' => true,
                'display_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Prix de gros',
                'description' => 'سعر الجملة - خصم 10%',
                'is_percentage' => true,
                'value' => 10.00,
                'active' => true,
                'display_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Prix spécial',
                'description' => 'سعر خاص - خصم 15%',
                'is_percentage' => true,
                'value' => 15.00,
                'active' => true,
                'display_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: RolesAndPermissionsSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Gate;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear cached permissions before starting
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // === Create Permissions ===
        // User permissions group
        Permission::firstOrCreate([
            'name' => 'view-users',
            'display_name' => 'عرض المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'عرض قائمة بجميع المستخدمين في النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-users',
            'display_name' => 'إنشاء مستخدمين',
            'group' => 'المستخدمين',
            'description' => 'إنشاء مستخدمين جدد في النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-users',
            'display_name' => 'تعديل المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'تعديل بيانات المستخدمين الحاليين',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-users',
            'display_name' => 'حذف المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'حذف المستخدمين من النظام',
        ]);

        // Articles (Products) permissions group
        Permission::firstOrCreate([
            'name' => 'view-articles',
            'display_name' => 'عرض المنتجات',
            'group' => 'المنتجات',
            'description' => 'عرض قائمة بجميع المنتجات',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-articles',
            'display_name' => 'إنشاء منتجات',
            'group' => 'المنتجات',
            'description' => 'إنشاء منتج جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-articles',
            'display_name' => 'تعديل المنتجات',
            'group' => 'المنتجات',
            'description' => 'تعديل بيانات منتج موجود',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-articles',
            'display_name' => 'حذف المنتجات',
            'group' => 'المنتجات',
            'description' => 'حذف منتج من النظام',
        ]);

        // Documents (Invoices) permissions group
        Permission::firstOrCreate([
            'name' => 'view-documents',
            'display_name' => 'عرض المستندات',
            'group' => 'المستندات',
            'description' => 'عرض جميع المستندات (فواتير، مستندات شراء، إلخ)',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-sales-documents',
            'display_name' => 'إنشاء مستندات بيع',
            'group' => 'المستندات',
            'description' => 'إنشاء مستندات بيع جديدة',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-purchase-documents',
            'display_name' => 'إنشاء مستندات شراء',
            'group' => 'المستندات',
            'description' => 'إنشاء مستندات شراء جديدة',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-documents',
            'display_name' => 'تعديل المستندات',
            'group' => 'المستندات',
            'description' => 'تعديل المستندات الموجودة',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-documents',
            'display_name' => 'حذف المستندات',
            'group' => 'المستندات',
            'description' => 'حذف المستندات من النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'validate-documents',
            'display_name' => 'تأكيد المستندات',
            'group' => 'المستندات',
            'description' => 'تأكيد المستندات لضمان صحتها',
        ]);

        // Roles & Permissions permissions
        Permission::firstOrCreate([
            'name' => 'manage-roles',
            'display_name' => 'إدارة الأدوار والصلاحيات',
            'group' => 'الإعدادات',
            'description' => 'التحكم في الأدوار والصلاحيات للمستخدمين',
        ]);

        // General Settings permissions
        Permission::firstOrCreate([
            'name' => 'manage-settings',
            'display_name' => 'إدارة الإعدادات',
            'group' => 'الإعدادات',
            'description' => 'إدارة الإعدادات العامة للنظام',
        ]);

        // Party permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_party',
            'display_name' => 'عرض جميع الأطراف',
            'group' => 'الأطراف',
            'description' => 'عرض قائمة بجميع الأطراف',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_party',
            'display_name' => 'عرض متعامل',
            'group' => 'الأطراف',
            'description' => 'عرض متعامل واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_party',
            'display_name' => 'إنشاء متعامل',
            'group' => 'الأطراف',
            'description' => 'إنشاء متعامل جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_party',
            'display_name' => 'تحديث متعامل',
            'group' => 'الأطراف',
            'description' => 'تحديث بيانات متعامل',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_party',
            'display_name' => 'حذف متعامل',
            'group' => 'الأطراف',
            'description' => 'حذف متعامل',
        ]);
        Permission::firstOrCreate([
            'name' => 'restore_party',
            'display_name' => 'استعادة متعامل',
            'group' => 'الأطراف',
            'description' => 'استعادة متعامل محذوف',
        ]);
        Permission::firstOrCreate([
            'name' => 'force_delete_party',
            'display_name' => 'حذف نهائي',
            'group' => 'الأطراف',
            'description' => 'حذف نهائي لمتعامل',
        ]);

        // Product permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_product',
            'display_name' => 'عرض جميع المنتجات',
            'group' => 'المنتجات',
            'description' => 'عرض قائمة بجميع المنتجات',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_product',
            'display_name' => 'عرض منتج',
            'group' => 'المنتجات',
            'description' => 'عرض منتج واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_product',
            'display_name' => 'إنشاء منتج',
            'group' => 'المنتجات',
            'description' => 'إنشاء منتج جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_product',
            'display_name' => 'تحديث منتج',
            'group' => 'المنتجات',
            'description' => 'تحديث بيانات منتج',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_product',
            'display_name' => 'حذف منتج',
            'group' => 'المنتجات',
            'description' => 'حذف منتج',
        ]);

        // Commercial Document permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_commercial_document',
            'display_name' => 'عرض جميع المستندات التجارية',
            'group' => 'المستندات',
            'description' => 'عرض قائمة بجميع المستندات التجارية',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_commercial_document',
            'display_name' => 'عرض مستند تجاري',
            'group' => 'المستندات',
            'description' => 'عرض مستند تجاري واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_commercial_document',
            'display_name' => 'إنشاء مستند تجاري',
            'group' => 'المستندات',
            'description' => 'إنشاء مستند تجاري جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_commercial_document',
            'display_name' => 'تحديث مستند تجاري',
            'group' => 'المستندات',
            'description' => 'تحديث بيانات مستند تجاري',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_commercial_document',
            'display_name' => 'حذف مستند تجاري',
            'group' => 'المستندات',
            'description' => 'حذف مستند تجاري',
        ]);


        // === Create Roles ===

        // Super Admin Role
        $superAdminRole = Role::firstOrCreate([
            'name' => 'super-admin',
            'display_name' => 'مدير خارق',
            'description' => 'يمتلك جميع الصلاحيات في النظام',
        ]);
        // تعيين كل الصلاحيات لدور المدير الخارق
        $superAdminRole->givePermissionTo(Permission::all());

        // Moderator Role
        $moderatorRole = Role::firstOrCreate([
            'name' => 'moderator',
            'display_name' => 'مشرف',
            'description' => 'يمكنه إدارة معظم أجزاء النظام',
        ]);
        $moderatorRole->givePermissionTo([
            'view-users', 'create-users', 'edit-users',
            'view-articles', 'create-articles', 'edit-articles',
            'view-documents', 'create-sales-documents', 'create-purchase-documents', 'edit-documents', 'validate-documents'
        ]);

        // Salesperson Role
        $salespersonRole = Role::firstOrCreate([
            'name' => 'salesperson',
            'display_name' => 'بائع',
            'description' => 'يمكنه إدارة عمليات البيع فقط',
        ]);
        $salespersonRole->givePermissionTo([
            'view-articles',
            'view-documents',
            'create-sales-documents',
        ]);
    }
}




// ===== ملف: TreasuryAccountSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 3. TreasuryAccountSeeder
 * ═══════════════════════════════════════════════════════════════════
 * مطلوب لجدول payment_modes
 */
class TreasuryAccountSeeder extends Seeder
{
    public function run(): void
    {
        $bankTypeId = DB::table('treasury_account_types')->where('name', 'bank')->value('id');
        $cashTypeId = DB::table('treasury_account_types')->where('name', 'cash')->value('id');

        DB::table('treasury_accounts')->insert([
            [
                'name' => 'الصندوق الرئيسي',
                'code' => 'CASH01',
                'treasury_account_type_id' => $cashTypeId,
                'bank_name' => null,
                'account_number' => null,
                'currency' => 'DZD',
                'initial_balance' => 0.00,
                'current_balance' => 0.00,
                'is_default' => true,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'البنك الوطني الجزائري',
                'code' => 'BNA01',
                'treasury_account_type_id' => $bankTypeId,
                'bank_name' => 'BNA',
                'account_number' => '00123456789',
                'currency' => 'DZD',
                'initial_balance' => 0.00,
                'current_balance' => 0.00,
                'is_default' => false,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: TvaSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TvaSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('tvas')->insert([
            [
                'name' => 'TVA 0%',
                'rate' => 0.00,
                'description' => 'معفى من الضريبة على القيمة المضافة',
                'active' => true,
                'is_default' => true,
                'display_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'TVA 9%',
                'rate' => 9.00,
                'description' => 'المعدل المخفض للضريبة على القيمة المضافة',
                'active' => true,
                'is_default' => false,
                'display_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'TVA 19%',
                'rate' => 19.00,
                'description' => 'المعدل العادي للضريبة على القيمة المضافة',
                'active' => true,
                'is_default' => false,
                'display_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}




// ===== ملف: UnitSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Unité', 'symbol' => 'UN', 'description' => 'وحدة'],
            ['name' => 'Pièce', 'symbol' => 'PC', 'description' => 'قطعة'],
            ['name' => 'Boîte', 'symbol' => 'BTE', 'description' => 'علبة'],
            ['name' => 'Carton', 'symbol' => 'CTN', 'description' => 'كرتون'],
            ['name' => 'Palette', 'symbol' => 'PLT', 'description' => 'باليطة'],
            ['name' => 'Kilogramme', 'symbol' => 'KG', 'description' => 'كيلوغرام'],
            ['name' => 'Gramme', 'symbol' => 'G', 'description' => 'غرام'],
            ['name' => 'Tonne', 'symbol' => 'T', 'description' => 'طن'],
            ['name' => 'Litre', 'symbol' => 'L', 'description' => 'لتر'],
            ['name' => 'Mètre', 'symbol' => 'M', 'description' => 'متر'],
            ['name' => 'Mètre carré', 'symbol' => 'M²', 'description' => 'متر مربع'],
            ['name' => 'Mètre cube', 'symbol' => 'M³', 'description' => 'متر مكعب'],
        ];

        $order = 1;
        foreach ($units as $unit) {
            DB::table('units')->insert([
                'name' => $unit['name'],
                'symbol' => $unit['symbol'],
                'description' => $unit['description'],
                'active' => true,
                'display_order' => $order++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}




// ===== ملف: UserSeeder.php =====
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
        ]);
        $superAdmin->assignRole('super-admin');

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin.user@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('moderator');
    }
}




// ===== ملف: WarehouseSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $wilayaId = DB::table('wilayas')->where('code', 39)->value('id'); // ELOUED

        DB::table('warehouses')->insert([
            'name' => 'Dépôt Principal',
            'code' => 'DP01',
            'address' => 'Cité 08 Mai, Eloued',
            'wilaya_id' => $wilayaId,
            'phone' => '029123456',
            'manager_name' => 'ABDESSADOK',
            'activity' => 'Stockage et distribution',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}




// ===== ملف: WilayaCommuneSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Seeder مدمج لضمان إدخال الولايات (Wilayas) أولاً ثم البلديات (Communes) بالترتيب الصحيح.
 * يقرأ البيانات من ملفات JSON موجودة في 'database/seeders/data/'.
 */
class WilayaCommuneSeeder extends Seeder
{
    /**
     * النقطة الرئيسية لتشغيل الـ Seeder.
     */
    public function run(): void
    {
        $this->command->info('Starting geographic data seeding (Wilayas and Communes)...');

        // تعطيل فحص المفاتيح الخارجية مؤقتاً لتنظيف الجداول
        Schema::disableForeignKeyConstraints();

        // تنظيف الجداول
        if (Schema::hasTable('communes')) {
            DB::table('communes')->truncate();
        }
        
        if (Schema::hasTable('wilayas')) {
            DB::table('wilayas')->truncate();
        }

        // إعادة تفعيل فحص المفاتيح الخارجية
        Schema::enableForeignKeyConstraints();

        // 1. تشغيل دالة إدخال الولايات
        $this->seedWilayas();

        // 2. تشغيل دالة إدخال البلديات (تعتمد على الولايات)
        $this->seedCommunes();

        $this->command->info('Geographic data seeding finished.');
    }

    // ===================================================================
    //  1. دالة إدخال الولايات
    // ===================================================================
    private function seedWilayas(): void
    {
        $this->command->line('Seeding Wilayas...');

        // التحقق من وجود الجدول
        if (!Schema::hasTable('wilayas')) {
            $this->command->error("جدول 'wilayas' غير موجود. يرجى تشغيل الـ migrations أولاً.");
            return;
        }

        // التحقق من وجود الملف
        $jsonPath = database_path('seeders/data/wilayas.json');
        if (!File::exists($jsonPath)) {
            $this->command->error("ملف البيانات 'wilayas.json' غير موجود في المسار: " . $jsonPath);
            return;
        }

        // قراءة الملف
        $json = File::get($jsonPath);
        $wilayas = json_decode($json);

        if (is_null($wilayas)) {
            $this->command->error("خطأ في قراءة ملف 'wilayas.json'. تأكد أن صيغة JSON صحيحة.");
            return;
        }

        $data = [];

        // تحضير البيانات للإدراج
        foreach ($wilayas as $wilaya) {
            $data[] = [
                'code' => $wilaya->code,
                'name' => $wilaya->name,
                'arabic_name' => $wilaya->arabic_name,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // إدراج جميع الولايات دفعة واحدة
        DB::table('wilayas')->insert($data);
        $this->command->info(count($data) . " ولاية تم إضافتها بنجاح.");
    }

    // ===================================================================
    //  2. دالة إدخال البلديات
    // ===================================================================
    private function seedCommunes(): void
    {
        $this->command->line('Seeding Communes...');

        // التحقق من وجود الجدول
        if (!Schema::hasTable('communes')) {
            $this->command->error("جدول 'communes' غير موجود. يرجى تشغيل الـ migrations أولاً.");
            return;
        }

        // التحقق من وجود بيانات الولايات (الأهم)
        if (!Schema::hasTable('wilayas') || DB::table('wilayas')->count() === 0) {
            $this->command->warn("جدول 'wilayas' فارغ. تم تخطي إدخال البلديات.");
            return;
        }

        // جلب كل الولايات مرة واحدة وربطها برمزها
        $wilayas = DB::table('wilayas')->pluck('id', 'code');

        // قراءة ملف البلديات
        $jsonPath = database_path('seeders/data/communes.json');

        // التحقق من وجود الملف
        if (!File::exists($jsonPath)) {
            $this->command->error("ملف البيانات 'communes.json' غير موجود في المسار: " . $jsonPath);
            return;
        }

        $json = File::get($jsonPath);
        $communes = json_decode($json);

        if (is_null($communes)) {
            $this->command->error("خطأ في قراءة ملف 'communes.json'. تأكد أن صيغة JSON صحيحة.");
            return;
        }

        $data = [];
        $skippedCount = 0;

        // تحضير بيانات البلديات
        foreach ($communes as $commune) {
            $wilayaId = $wilayas->get($commune->wilaya_id);

            if ($wilayaId) {
                $data[] = [
                    'name' => $commune->name,
                    'arabic_name' => $commune->arabic_name,
                    'post_code' => $commune->post_code,
                    'wilaya_id' => $wilayaId,
                    'active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            } else {
                $skippedCount++;
            }
        }

        // إدراج جميع البلديات دفعة واحدة
        DB::table('communes')->insert($data);

        $this->command->info(count($data) . " بلدية تم إضافتها بنجاح.");
        if ($skippedCount > 0) {
            $this->command->warn("تم تخطي " . $skippedCount . " بلدية لعدم العثور على رمز ولاية مطابق.");
        }
    }
}


