<?php

// دمج تلقائي لكل ملفات الـ seeders



// ===== ملف: CompanySeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $wilayaId = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي

        // جلب المستخدم الأول الذي أُنشئ في UserSeeder
        $superAdminId = DB::table('users')->where('email', 'admin@mail.com')->value('id');

        $companyId = DB::table('companies')->insertGetId([
            'name'            => 'Mon Entreprise',
            'commercial_name' => 'Mon Entreprise',
            'slug'            => 'mon-entreprise',
            'activity'        => 'Commerce et distribution',
            'nif'             => '000000000000000',
            'wilaya_id'       => $wilayaId,
            'phone'           => '032000000',
            'email'           => 'contact@monentreprise.dz',
            'owner_id'        => $superAdminId,
            'active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // ضبط company_id في config لاستخدامه في Seeders اللاحقة
        config(['seeding.company_id' => $companyId]);

        // ربط المستخدمين بالشركة عبر company_user
        if ($superAdminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $superAdminId,
                'is_default' => true,
                'role'       => 'super-admin',
                'joined_at'  => now(),
                'active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $adminId = DB::table('users')->where('email', 'admin.user@mail.com')->value('id');
        if ($adminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $adminId,
                'is_default' => true,
                'role'       => 'admin',
                'joined_at'  => now(),
                'active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}




// ===== ملف: CurrencySeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('currencies')->upsert([
            [
                'company_id'       => $companyId,
                'name'             => 'Dinar Algérien',
                'code'             => 'DZD',
                'symbol'           => 'د.ج',
                'decimal_places'   => 2,
                'is_base_currency' => true,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'company_id'       => $companyId,
                'name'             => 'Euro',
                'code'             => 'EUR',
                'symbol'           => '€',
                'decimal_places'   => 2,
                'is_base_currency' => false,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'company_id'       => $companyId,
                'name'             => 'US Dollar',
                'code'             => 'USD',
                'symbol'           => '$',
                'decimal_places'   => 2,
                'is_base_currency' => false,
                'active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ], ['company_id', 'code']); // التصحيح: المفتاح الفريد المركب
    }
}




// ===== ملف: DatabaseSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ═══════════════════════════════════════════════════════════
        // المرحلة 1: البيانات الجغرافية (مستقلة تماماً)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WilayaCommuneSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 2: المستخدم الأول (قبل الشركة لأن companies.owner_id → users)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            UserSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 3: الشركة (تحتاج user_id لربط owner_id)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            CompanySeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 4: جداول Lookup المرتبطة بالشركة
        // ═══════════════════════════════════════════════════════════
        $this->call([
            GenderSeeder::class,
            CurrencySeeder::class,
            TvaSeeder::class,
            UnitSeeder::class,
            LegalFormSeeder::class,
            FiscalStampSeeder::class,
            InventoryValuationMethodSeeder::class,
            DocumentBaseOperationSeeder::class,
            DocumentStatusSeeder::class,
            PriceLevelSeeder::class,
            ExpenseCategorySeeder::class,
            PartyTypeSeeder::class,
            ProductTypeSeeder::class,
            StockMovementTypeSeeder::class,
            TreasuryAccountTypeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 5: الصلاحيات والأدوار (بعد الشركة)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 6: السنة المالية
        // ═══════════════════════════════════════════════════════════
        $this->call([
            FiscalYearSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 7: المستودعات
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WarehouseSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 8: الخزينة وطرق الدفع
        // ═══════════════════════════════════════════════════════════
        $this->call([
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 9: أنواع المستندات وسلاسل الترقيم
        // ═══════════════════════════════════════════════════════════
        $this->call([
            DocumentTypeSeeder::class,
            NumberingSeriesSeeder::class,
        ]);
    }
}




// ===== ملف: DocumentBaseOperationSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentBaseOperationSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('document_base_operations')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'sale',
                'label'         => 'مبيعات',
                'description'   => 'عمليات البيع للعملاء',
                'active'     => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'purchase',
                'label'         => 'مشتريات',
                'description'   => 'عمليات الشراء من الموردين',
                'active'     => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'transfer',
                'label'         => 'نقل',
                'description'   => 'نقل المخزون بين المستودعات',
                'active'     => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'adjustment',
                'label'         => 'تعديل',
                'description'   => 'تعديلات المخزون',
                'active'     => true,
                'display_order' => 4,
                'created_at'    => now(),
                'updated_at'    => now(),
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $statuses = [
            ['name' => 'draft',          'label' => 'مسودة',          'color' => 'gray'],
            ['name' => 'pending',        'label' => 'قيد الانتظار',    'color' => 'yellow'],
            ['name' => 'validated',      'label' => 'معتمد',           'color' => 'blue'],
            ['name' => 'partially_paid', 'label' => 'مدفوع جزئياً',    'color' => 'orange'],
            ['name' => 'paid',           'label' => 'مدفوع',           'color' => 'green'],
            ['name' => 'overdue',        'label' => 'متأخر',           'color' => 'red'],
            ['name' => 'cancelled',      'label' => 'ملغي',            'color' => 'red'],
            ['name' => 'returned',       'label' => 'مرتجع',           'color' => 'purple'],
        ];

        foreach ($statuses as $status) {
            DB::table('document_statuses')->insert([
                'company_id' => $companyId,
                'name'       => $status['name'],
                'label'      => $status['label'],
                'color'      => $status['color'],
                'active'  => true,
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $sale     = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'sale')->value('id');
        $purchase = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'purchase')->value('id');
        $transfer = DB::table('document_base_operations')->where('company_id', $companyId)->where('name', 'transfer')->value('id');

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
    }
}




// ===== ملف: ExpenseCategorySeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('expense_categories')->insert([
            ['company_id' => $companyId, 'name' => 'مصاريف الموظفين', 'code' => 'STAFF', 'description' => 'رواتب، أجور، تأمينات اجتماعية', 'parent_id' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف النقل',    'code' => 'TRANS', 'description' => 'شحن، نقل بضائع، محروقات',        'parent_id' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف إدارية',  'code' => 'ADMIN', 'description' => 'كهرباء، ماء، هاتف، إيجار',        'parent_id' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف تسويق',   'code' => 'MRKT',  'description' => 'إعلانات، دعاية، عروض ترويجية',    'parent_id' => null, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف أخرى',     'code' => 'OTHER', 'description' => 'مصاريف متنوعة لا تندرج تحت أي فئة أخرى', 'parent_id' => null, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $stamps = [
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 100 DA',
                'min_amount'   => 0.00,
                'max_amount'   => 1000.00,
                'stamp_value'  => 100.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 300 DA',
                'min_amount'   => 1000.01,
                'max_amount'   => 5000.00,
                'stamp_value'  => 300.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'company_id'   => $companyId,
                'name'         => 'Timbre 1000 DA',
                'min_amount'   => 5000.01,
                'max_amount'   => null,
                'stamp_value'  => 1000.00,
                'type'         => 'fixed',
                'active'       => true,
                'valid_from'   => '2024-01-01',
                'valid_to'     => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ];

        foreach ($stamps as $stamp) {
            // تجنب التكرار: إدراج فقط إن لم تكن موجودة
            DB::table('fiscal_stamps')->updateOrInsert(
                ['company_id' => $stamp['company_id'], 'name' => $stamp['name']],
                $stamp
            );
        }
    }
}




// ===== ملف: FiscalYearSeeder.php =====
namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = Carbon::now()->year;
        $companyId   = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('fiscal_years')->insert([
            'company_id' => $companyId,
            'name'       => "Exercice $currentYear",
            'start_date' => "$currentYear-01-01",
            'end_date'   => "$currentYear-12-31",
            'is_closed'  => false,
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('genders')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'male',
                'label'         => 'ذكر',
                'active'     => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'female',
                'label'         => 'أنثى',
                'active'     => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}



// ===== ملف: InventoryValuationMethodSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventoryValuationMethodSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('inventory_valuation_methods')->upsert([
            [
                'company_id'  => $companyId,
                'name'        => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'      => 'fifo',
                'is_default'  => true,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'      => 'lifo',
                'is_default'  => false,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'المتوسط المرجح',
                'method'      => 'weighted_average',
                'is_default'  => false,
                'active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ], ['company_id', 'name']); // المفتاح الفريد المركب
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $legalForms = [
            [
                'code'             => 'SARL',
                'name'             => 'Société à Responsabilité Limitée - شركة ذات مسؤولية محدودة',
                'description'      => 'الشكل القانوني الأكثر شيوعاً في الجزائر',
                'requires_capital' => true,
                'active'           => true,
            ],
            [
                'code'             => 'EURL',
                'name'             => 'Entreprise Unipersonnelle à Responsabilité Limitée - مؤسسة فردية ذات مسؤولية محدودة',
                'description'      => 'شركة فردية بشريك واحد',
                'requires_capital' => true,
                'active'           => true,
            ],
            [
                'code'             => 'SPA',
                'name'             => 'Société Par Actions - شركة المساهمة',
                'description'      => 'شركة مساهمة كبيرة',
                'requires_capital' => true,
                'active'           => true,
            ],
            [
                'code'             => 'SNC',
                'name'             => 'Société en Nom Collectif - شركة التضامن',
                'description'      => 'جميع الشركاء متضامنون',
                'requires_capital' => true,
                'active'           => true,
            ],
            [
                'code'             => 'SCS',
                'name'             => 'Société en Commandite Simple - شركة التوصية البسيطة',
                'description'      => 'شركاء متضامنون وموصون',
                'requires_capital' => true,
                'active'           => true,
            ],
            [
                'code'             => 'EI',
                'name'             => 'Entreprise Individuelle - مؤسسة فردية',
                'description'      => 'مؤسسة فردية بدون شخصية معنوية',
                'requires_capital' => false,
                'active'           => true,
            ],
        ];

        foreach ($legalForms as $form) {
            DB::table('legal_forms')->upsert(
                array_merge($form, [
                    'company_id' => $companyId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]),
                ['company_id', 'code'], // المفتاح الفريد المركب
                array_keys($form)
            );
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
        $companyId   = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->value('id');
        $year        = date('Y');

        $documentTypes = DB::table('document_types')->where('company_id', $companyId)->get();

        $rows = [];
        foreach ($documentTypes as $docType) {
            $rows[] = [
                'company_id'       => $companyId,
                'document_type_id' => $docType->id,
                'warehouse_id'     => $warehouseId,
                'prefix'           => $docType->code,
                'suffix'           => null,
                'format'           => '{PREFIX}/{YY}/{NUMBER:6}',
                'last_number'      => 0,
                'start_number'     => 1,
                'padding'          => 6,
                'reset_yearly'     => true,
                'reset_monthly'    => false,
                'current_year'     => $year,
                'active'           => true,
                'is_locked'        => false,
                'created_at'       => now(),
                'updated_at'       => now(),
            ];
        }

        if (!empty($rows)) {
            DB::table('numbering_series')->insert($rows);
        }
    }
}




// ===== ملف: PartierSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * PartierSeeder — بيانات تجريبية للأطراف (زبائن وموردون)
 *
 * هذا الـ Seeder اختياري ويُستخدم في بيئة التطوير فقط.
 * لا يُستدعى من DatabaseSeeder تلقائياً — يمكن تشغيله بشكل منفصل:
 *
 *   php artisan db:seed --class=PartierSeeder
 *
 * متطلبات قبل التشغيل:
 *   - CompanySeeder     (company_id)
 *   - WilayaCommuneSeeder (wilaya_id, commune_id)
 *   - PriceLevelSeeder  (default_price_level_id)
 *   - LegalFormSeeder   (legal_form_id)
 */
class PartierSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->first()->id;
        

        if (! $companyId) {
            $this->command->warn('PartierSeeder: لا توجد شركة — نفّذ CompanySeeder أولاً.');
            return;
        }

        $wilayaId   = DB::table('wilayas')->where('code', 39)->value('id');   // الوادي
        $communeId  = DB::table('communes')->where('wilaya_id', $wilayaId)->value('id');
        $clientType = DB::table('party_types')->where('name', 'client')->value('id');
        $supplierType = DB::table('party_types')->where('name', 'supplier')->value('id');
        $bothType   = DB::table('party_types')->where('name', 'both')->value('id');
        $priceLevelId = DB::table('price_levels')->where('is_default', true)->value('id');
        $legalFormId  = DB::table('legal_forms')->where('code', 'EURL')->value('id');

        $now = now();

        $parties = [
            // ── زبائن ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $clientType,
                'code'                 => 'CLI001',
                'name'                 => 'مؤسسة النجاح للتجارة',
                'commercial_name'      => 'النجاح',
                'slug'                 => 'cli001-najah',
                'nif'                  => '001234567890123',
                'nis'                  => '123456789',
                'rc'                   => '39/00-0123456B/00',
                'ai'                   => '39012345678',
                'legal_form_id'        => $legalFormId,
                'address'              => 'حي التوفيق، شارع الاستقلال',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => $communeId,
                'phone'                => '029300100',
                'mobile'               => '0550100200',
                'email'                => 'najah@example.dz',
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 500000.00,
                'credit_days'          => 30,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],
            [
                'company_id'           => $companyId,
                'party_type_id'        => $clientType,
                'code'                 => 'CLI002',
                'name'                 => 'شركة الفجر للمواد الغذائية',
                'commercial_name'      => 'الفجر',
                'slug'                 => 'cli002-fajr',
                'nif'                  => '001234567890124',
                'nis'                  => null,
                'rc'                   => null,
                'ai'                   => null,
                'legal_form_id'        => null,
                'address'              => null,
                'wilaya_id'            => $wilayaId,
                'commune_id'           => null,
                'phone'                => '029300200',
                'mobile'               => '0661200300',
                'email'                => null,
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 0.00,
                'credit_days'          => null,
                'is_tva_exempt'        => true,
                'is_taxable'           => false,
                'is_final_consumer'    => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // ── مورد ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $supplierType,
                'code'                 => 'FRN001',
                'name'                 => 'مؤسسة اية فود',
                'commercial_name'      => 'اية فود',
                'slug'                 => 'frn001-amal',
                'nif'                  => '001234567890125',
                'nis'                  => '987654321',
                'rc'                   => '39/00-0654321B/00',
                'ai'                   => '39098765432',
                'legal_form_id'        => $legalFormId,
                'address'              => 'منطقة النشاط الصناعي',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => $communeId,
                'phone'                => '029300300',
                'mobile'               => '0770300400',
                'email'                => 'amal-supply@example.dz',
                'default_price_level_id' => null,
                'credit_limit'         => 0.00,
                'credit_days'          => 45,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // ── زبون + مورد ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $bothType,
                'code'                 => 'BOTH001',
                'name'                 => 'مؤسسة هبات التجارية',
                'commercial_name'      => 'هبات للتموين',
                'slug'                 => 'both001-wasit',
                'nif'                  => '001234567890126',
                'nis'                  => null,
                'rc'                   => null,
                'ai'                   => null,
                'legal_form_id'        => null,
                'address'              => 'السوق المركزي',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => null,
                'phone'                => '029300400',
                'mobile'               => '0551400500',
                'email'                => null,
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 200000.00,
                'credit_days'          => 15,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],
        ];

        // إضافة القيم الافتراضية للحقول غير الموجودة في كل سجل
        $defaults = [
            'commercial_name'      => null,
            'activity'             => null,
            'rc'                   => null,
            'nif'                  => null,
            'nis'                  => null,
            'ai'                   => null,
            'legal_form_id'        => null,
            'capital_amount'       => null,
            'rc_date'              => null,
            'address'              => null,
            'commune_id'           => null,
            'wilaya_id'            => null,
            'phone'                => null,
            'mobile'               => null,
            'fax'                  => null,
            'email'                => null,
            'avatar'               => null,
            'bank_name'            => null,
            'rib'                  => null,
            'initial_balance'      => 0.00,
            'credit_limit'         => 0.00,
            'default_price_level_id' => null,
            'credit_days'          => null,
            'is_tva_exempt'        => false,
            'is_taxable'           => true,
            'tax_option'           => null,
            'cnas_number'          => null,
            'tax_regime'           => null,
            'is_final_consumer'    => false,
            'is_vat_registered'    => false,
            'vat_registration_date'=> null,
            'additional_data'      => null,
            'active'               => true,
        ];

        foreach ($parties as &$party) {
            $party = array_merge($defaults, $party);
        }

        DB::table('parties')->insert($parties);

        $this->command->info('PartierSeeder: تم إضافة ' . count($parties) . ' طرف (زبائن/موردون) بنجاح.');
    }
}



// ===== ملف: PartyTypeSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PartyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('party_types')->insert([
            ['company_id' => $companyId, 'name' => 'client', 'label' => 'زبون', 'description' => 'زبون', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'supplier', 'label' => 'ممون', 'description' => 'ممون', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'both', 'label' => 'زبون وممون', 'description' => 'زبون وممون في آن واحد', 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
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
        $companyId    = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $cashAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'CASH01')->value('id');
        $bankAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'BNA01')->value('id');

        DB::table('payment_modes')->insert([
            ['company_id' => $companyId, 'name' => 'نقداً',         'code' => 'CASH',  'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'شيك',           'code' => 'CHQ',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'تحويل بنكي',   'code' => 'VIR',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'بطاقة بنكية',  'code' => 'CB',    'treasury_account_id' => $bankAccountId, 'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'دفع آجل',      'code' => 'CREDIT','treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
        ]);
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('price_levels')->insert([
            ['company_id' => $companyId, 'name' => 'Tarif Détail',     'description' => 'سعر التجزئة',     'is_default' => true,  'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Demi-Gros',  'description' => 'سعر نصف الجملة',  'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Gros',       'description' => 'سعر الجملة',      'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}




// ===== ملف: ProductTypeSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('product_types')->insert([
            ['company_id' => $companyId, 'name' => 'stockable', 'label' => 'مخزون', 'description' => 'منتج مادي يدار له المخزون', 'manages_stock' => true, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'service', 'label' => 'خدمة', 'description' => 'خدمة غير مادية', 'manages_stock' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'consumable', 'label' => 'مستهلك', 'description' => 'مستلزمات مستهلكة ', 'manages_stock' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}




// ===== ملف: RolesAndPermissionsSeeder.php =====
namespace Database\Seeders;

use App\Services\CompanyRoleService;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * RolesAndPermissionsSeeder
 * ══════════════════════════════════════════════════════════════════
 * مسؤول عن:
 *  1. إنشاء جميع الصلاحيات العالمية (company_id = null)
 *  2. إنشاء دور super-admin العالمي ومنحه كل الصلاحيات
 *  3. بذر أدوار الشركة الأولى (seed) عبر CompanyRoleService
 *  4. تعيين الأدوار للمستخدمين الأوليين
 *
 * ملاحظة: عند إنشاء شركة جديدة يتم استدعاء CompanyRoleService
 *          تلقائياً من CompanyObserver::created()
 * ══════════════════════════════════════════════════════════════════
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function run(): void
    {
        $companyId = config('seeding.company_id');

        // مسح الكاش أولاً
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // ── الخطوة 1: إنشاء الصلاحيات العالمية ──────────────────
        $this->seedPermissions();

        // ── الخطوة 2: إنشاء دور super-admin العالمي ──────────────
        $this->seedSuperAdmin();

        // ── الخطوة 3: بذر أدوار الشركة الأولى ───────────────────
        $this->roleService->seedRoles($companyId);
        $this->command->info("✅ تم إنشاء أدوار الشركة #{$companyId}");

        // ── الخطوة 4: تعيين الأدوار للمستخدمين الأوليين ──────────
        $this->assignInitialUsers($companyId);

        // مسح الكاش في النهاية
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command->info('🎉 اكتمل الـ Seeder بنجاح!');
    }

    // ─────────────────────────────────────────────────────────────

    private function seedPermissions(): void
    {
        foreach ($this->getPermissions() as $perm) {
            Permission::firstOrCreate(
                [
                    'name'       => $perm['name'],
                    'guard_name' => 'web',
                    'company_id' => null,          // عالمية دائماً
                ],
                [
                    'display_name' => $perm['display_name'] ?? $perm['name'],
                    'group'        => $perm['group']        ?? 'عام',
                    'description'  => $perm['description']  ?? '',
                ]
            );
        }

        $this->command->info('✅ تم إنشاء ' . Permission::whereNull('company_id')->count() . ' صلاحية');
    }

    private function seedSuperAdmin(): void
    {
        $superAdmin = Role::firstOrCreate(
            [
                'name'       => 'super-admin',
                'guard_name' => 'web',
                'company_id' => null,             // عالمي
            ],
            [
                'display_name' => 'مدير النظام',
                'description'  => 'صلاحيات كاملة على كل شيء',
            ]
        );

        // super-admin يحصل على كل الصلاحيات العالمية دائماً
        $superAdmin->syncPermissions(Permission::whereNull('company_id')->get());

        $this->command->info('✅ تم إعداد دور super-admin');
    }

    private function assignInitialUsers(int $companyId): void
    {
        // المستخدم العالمي (super-admin)
        $superAdminUser = \App\Models\User::where('email', 'admin@mail.com')->first();
        if ($superAdminUser) {
            $superAdminRole = Role::where('name', 'super-admin')->whereNull('company_id')->first();
            $superAdminUser->syncRoles([$superAdminRole]);
            $this->command->line('  ↳ super-admin: admin@mail.com');
        }

        // مدير الشركة الأولى
        $adminUser = \App\Models\User::where('email', 'admin.user@mail.com')->first();
        if ($adminUser) {
            $this->roleService->assignRole($adminUser, 'admin', $companyId);
            $this->command->line('  ↳ admin: admin.user@mail.com');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // قائمة الصلاحيات العالمية
    // ─────────────────────────────────────────────────────────────

    private function getPermissions(): array
    {
        return [

            // ══════════════════════════════════════════════════════
            // 1. المستخدمون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_user',        'display_name' => 'عرض قائمة المستخدمين',      'group' => 'المستخدمون', 'description' => 'عرض قائمة جميع مستخدمي الشركة'],
            ['name' => 'view_user',            'display_name' => 'عرض مستخدم',                'group' => 'المستخدمون', 'description' => 'عرض تفاصيل مستخدم واحد'],
            ['name' => 'create_user',          'display_name' => 'إنشاء مستخدم',              'group' => 'المستخدمون', 'description' => 'إضافة مستخدم جديد للشركة'],
            ['name' => 'update_user',          'display_name' => 'تعديل مستخدم',              'group' => 'المستخدمون', 'description' => 'تعديل بيانات مستخدم موجود'],
            ['name' => 'delete_user',          'display_name' => 'حذف مستخدم',                'group' => 'المستخدمون', 'description' => 'حذف مستخدم من الشركة'],
            ['name' => 'restore_user',         'display_name' => 'استعادة مستخدم',            'group' => 'المستخدمون', 'description' => 'استعادة مستخدم محذوف'],
            ['name' => 'force_delete_user',    'display_name' => 'حذف نهائي لمستخدم',         'group' => 'المستخدمون', 'description' => 'الحذف النهائي لمستخدم'],
            ['name' => 'toggle_active_user',   'display_name' => 'تفعيل/تعطيل مستخدم',        'group' => 'المستخدمون', 'description' => 'تغيير حالة تفعيل المستخدم'],
            ['name' => 'change_password_user', 'display_name' => 'تغيير كلمة مرور مستخدم',    'group' => 'المستخدمون', 'description' => 'تغيير كلمة مرور مستخدم آخر'],
            ['name' => 'assign_role_user',     'display_name' => 'تعيين دور لمستخدم',         'group' => 'المستخدمون', 'description' => 'تغيير دور مستخدم داخل الشركة'],

            // ══════════════════════════════════════════════════════
            // 2. الأطراف
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_party',     'display_name' => 'عرض قائمة الأطراف',   'group' => 'الأطراف', 'description' => 'عرض قائمة العملاء والموردين'],
            ['name' => 'view_party',         'display_name' => 'عرض طرف',             'group' => 'الأطراف', 'description' => 'عرض تفاصيل عميل أو مورد'],
            ['name' => 'create_party',       'display_name' => 'إنشاء طرف',           'group' => 'الأطراف', 'description' => 'إضافة عميل أو مورد جديد'],
            ['name' => 'update_party',       'display_name' => 'تعديل طرف',           'group' => 'الأطراف', 'description' => 'تعديل بيانات عميل أو مورد'],
            ['name' => 'delete_party',       'display_name' => 'حذف طرف',             'group' => 'الأطراف', 'description' => 'حذف عميل أو مورد'],
            ['name' => 'restore_party',      'display_name' => 'استعادة طرف',         'group' => 'الأطراف', 'description' => 'استعادة عميل أو مورد محذوف'],
            ['name' => 'force_delete_party', 'display_name' => 'حذف نهائي لطرف',      'group' => 'الأطراف', 'description' => 'الحذف النهائي لعميل أو مورد'],

            // ══════════════════════════════════════════════════════
            // 3. المنتجات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_product',        'display_name' => 'عرض قائمة المنتجات',      'group' => 'المنتجات', 'description' => 'عرض قائمة جميع المنتجات'],
            ['name' => 'view_product',            'display_name' => 'عرض منتج',                'group' => 'المنتجات', 'description' => 'عرض تفاصيل منتج واحد'],
            ['name' => 'create_product',          'display_name' => 'إنشاء منتج',              'group' => 'المنتجات', 'description' => 'إضافة منتج جديد'],
            ['name' => 'update_product',          'display_name' => 'تعديل منتج',              'group' => 'المنتجات', 'description' => 'تعديل بيانات منتج موجود'],
            ['name' => 'delete_product',          'display_name' => 'حذف منتج',                'group' => 'المنتجات', 'description' => 'حذف منتج'],
            ['name' => 'restore_product',         'display_name' => 'استعادة منتج',            'group' => 'المنتجات', 'description' => 'استعادة منتج محذوف'],
            ['name' => 'manage_product_prices',   'display_name' => 'إدارة أسعار المنتجات',    'group' => 'المنتجات', 'description' => 'تعديل أسعار المنتجات وتعريفاتها'],
            ['name' => 'manage_product_variants', 'display_name' => 'إدارة متغيرات المنتجات',  'group' => 'المنتجات', 'description' => 'إدارة متغيرات وتعبئة المنتجات'],
            ['name' => 'manage_barcodes',         'display_name' => 'إدارة الباركود',           'group' => 'المنتجات', 'description' => 'إضافة وتعديل وحذف الباركود'],
            ['name' => 'manage_quantity_discounts','display_name' => 'إدارة تخفيضات الكميات',  'group' => 'المنتجات', 'description' => 'إدارة تخفيضات الكميات للمنتجات'],

            // ══════════════════════════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_warehouse', 'display_name' => 'عرض قائمة المستودعات', 'group' => 'المستودعات', 'description' => 'عرض قائمة جميع المستودعات'],
            ['name' => 'view_warehouse',     'display_name' => 'عرض مستودع',           'group' => 'المستودعات', 'description' => 'عرض تفاصيل مستودع'],
            ['name' => 'create_warehouse',   'display_name' => 'إنشاء مستودع',         'group' => 'المستودعات', 'description' => 'إضافة مستودع جديد'],
            ['name' => 'update_warehouse',   'display_name' => 'تعديل مستودع',         'group' => 'المستودعات', 'description' => 'تعديل بيانات مستودع'],
            ['name' => 'delete_warehouse',   'display_name' => 'حذف مستودع',           'group' => 'المستودعات', 'description' => 'حذف مستودع'],

            // ══════════════════════════════════════════════════════
            // 5. المستندات التجارية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_commercial_document',  'display_name' => 'عرض قائمة المستندات',   'group' => 'المستندات', 'description' => 'عرض قائمة جميع المستندات التجارية'],
            ['name' => 'view_commercial_document',      'display_name' => 'عرض مستند',             'group' => 'المستندات', 'description' => 'عرض تفاصيل مستند تجاري'],
            ['name' => 'create_sales_document',         'display_name' => 'إنشاء مستند بيع',       'group' => 'المستندات', 'description' => 'إنشاء فاتورة بيع أو عرض سعر'],
            ['name' => 'create_purchase_document',      'display_name' => 'إنشاء مستند شراء',      'group' => 'المستندات', 'description' => 'إنشاء فاتورة شراء أو أمر شراء'],
            ['name' => 'update_commercial_document',    'display_name' => 'تعديل مستند',           'group' => 'المستندات', 'description' => 'تعديل مستند تجاري غير مؤكد'],
            ['name' => 'delete_commercial_document',    'display_name' => 'حذف مستند',             'group' => 'المستندات', 'description' => 'حذف مستند تجاري'],
            ['name' => 'validate_commercial_document',  'display_name' => 'تأكيد مستند',           'group' => 'المستندات', 'description' => 'تأكيد وإقفال مستند تجاري'],
            ['name' => 'lock_commercial_document',      'display_name' => 'قفل/فتح مستند',         'group' => 'المستندات', 'description' => 'قفل أو فتح مستند تجاري'],
            ['name' => 'cancel_commercial_document',    'display_name' => 'إلغاء مستند',           'group' => 'المستندات', 'description' => 'إلغاء مستند تجاري'],
            ['name' => 'duplicate_commercial_document', 'display_name' => 'نسخ مستند',             'group' => 'المستندات', 'description' => 'نسخ مستند تجاري موجود'],
            ['name' => 'manage_numbering_series',       'display_name' => 'إدارة سلاسل الترقيم',   'group' => 'المستندات', 'description' => 'إدارة سلاسل ترقيم المستندات'],

            // ══════════════════════════════════════════════════════
            // 6. المدفوعات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_payment', 'display_name' => 'عرض قائمة المدفوعات', 'group' => 'المدفوعات', 'description' => 'عرض قائمة جميع المدفوعات'],
            ['name' => 'view_payment',     'display_name' => 'عرض دفعة',            'group' => 'المدفوعات', 'description' => 'عرض تفاصيل دفعة واحدة'],
            ['name' => 'create_payment',   'display_name' => 'إنشاء دفعة',          'group' => 'المدفوعات', 'description' => 'تسجيل دفعة جديدة'],
            ['name' => 'update_payment',   'display_name' => 'تعديل دفعة',          'group' => 'المدفوعات', 'description' => 'تعديل بيانات دفعة'],
            ['name' => 'delete_payment',   'display_name' => 'حذف دفعة',            'group' => 'المدفوعات', 'description' => 'حذف دفعة'],

            // ══════════════════════════════════════════════════════
            // 7. الشيكات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_check',     'display_name' => 'عرض قائمة الشيكات',  'group' => 'الشيكات', 'description' => 'عرض قائمة جميع الشيكات'],
            ['name' => 'view_check',         'display_name' => 'عرض شيك',            'group' => 'الشيكات', 'description' => 'عرض تفاصيل شيك'],
            ['name' => 'create_check',       'display_name' => 'إنشاء شيك',          'group' => 'الشيكات', 'description' => 'تسجيل شيك جديد'],
            ['name' => 'update_check',       'display_name' => 'تعديل شيك',          'group' => 'الشيكات', 'description' => 'تعديل بيانات شيك'],
            ['name' => 'delete_check',       'display_name' => 'حذف شيك',            'group' => 'الشيكات', 'description' => 'حذف شيك'],
            ['name' => 'manage_check_status','display_name' => 'إدارة حالة الشيكات', 'group' => 'الشيكات', 'description' => 'تحديث حالة الشيك (صُرف/مرتجع...)'],

            // ══════════════════════════════════════════════════════
            // 8. المصروفات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_expense', 'display_name' => 'عرض قائمة المصروفات', 'group' => 'المصروفات', 'description' => 'عرض قائمة جميع المصروفات'],
            ['name' => 'view_expense',     'display_name' => 'عرض مصروف',           'group' => 'المصروفات', 'description' => 'عرض تفاصيل مصروف'],
            ['name' => 'create_expense',   'display_name' => 'إنشاء مصروف',         'group' => 'المصروفات', 'description' => 'تسجيل مصروف جديد'],
            ['name' => 'update_expense',   'display_name' => 'تعديل مصروف',         'group' => 'المصروفات', 'description' => 'تعديل بيانات مصروف'],
            ['name' => 'delete_expense',   'display_name' => 'حذف مصروف',           'group' => 'المصروفات', 'description' => 'حذف مصروف'],

            // ══════════════════════════════════════════════════════
            // 9. الخزينة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_treasury_account', 'display_name' => 'عرض حسابات الخزينة',    'group' => 'الخزينة', 'description' => 'عرض قائمة جميع حسابات الخزينة والبنوك'],
            ['name' => 'view_treasury_account',     'display_name' => 'عرض حساب خزينة',        'group' => 'الخزينة', 'description' => 'عرض تفاصيل حساب خزينة'],
            ['name' => 'create_treasury_account',   'display_name' => 'إنشاء حساب خزينة',      'group' => 'الخزينة', 'description' => 'إضافة حساب خزينة أو بنك جديد'],
            ['name' => 'update_treasury_account',   'display_name' => 'تعديل حساب خزينة',      'group' => 'الخزينة', 'description' => 'تعديل بيانات حساب خزينة'],
            ['name' => 'delete_treasury_account',   'display_name' => 'حذف حساب خزينة',        'group' => 'الخزينة', 'description' => 'حذف حساب خزينة'],

            // ══════════════════════════════════════════════════════
            // 10. المخزون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_stock_movement', 'display_name' => 'عرض حركات المخزون',       'group' => 'المخزون', 'description' => 'عرض قائمة حركات المخزون'],
            ['name' => 'view_stock_movement',     'display_name' => 'عرض حركة مخزون',         'group' => 'المخزون', 'description' => 'عرض تفاصيل حركة مخزون'],
            ['name' => 'create_stock_movement',   'display_name' => 'إنشاء حركة مخزون',       'group' => 'المخزون', 'description' => 'تسجيل حركة مخزون يدوية'],
            ['name' => 'delete_stock_movement',   'display_name' => 'حذف حركة مخزون',         'group' => 'المخزون', 'description' => 'حذف حركة مخزون'],
            ['name' => 'view_any_product_lot',    'display_name' => 'عرض دفعات المنتجات',     'group' => 'المخزون', 'description' => 'عرض قائمة دفعات المنتجات'],
            ['name' => 'manage_product_lot',      'display_name' => 'إدارة دفعات المنتجات',   'group' => 'المخزون', 'description' => 'إضافة وتعديل وحذف دفعات المنتجات'],
            ['name' => 'manage_opening_balances', 'display_name' => 'إدارة الأرصدة الافتتاحية','group' => 'المخزون', 'description' => 'إدارة أرصدة المخزون والأطراف الافتتاحية'],

            // ══════════════════════════════════════════════════════
            // 11. الموظفون
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_employee',           'display_name' => 'عرض قائمة الموظفين', 'group' => 'الموظفون', 'description' => 'عرض قائمة جميع الموظفين'],
            ['name' => 'view_employee',               'display_name' => 'عرض موظف',           'group' => 'الموظفون', 'description' => 'عرض تفاصيل موظف'],
            ['name' => 'create_employee',             'display_name' => 'إنشاء موظف',         'group' => 'الموظفون', 'description' => 'إضافة موظف جديد'],
            ['name' => 'update_employee',             'display_name' => 'تعديل موظف',         'group' => 'الموظفون', 'description' => 'تعديل بيانات موظف'],
            ['name' => 'delete_employee',             'display_name' => 'حذف موظف',           'group' => 'الموظفون', 'description' => 'حذف موظف'],
            ['name' => 'manage_employment_contracts', 'display_name' => 'إدارة عقود العمل',   'group' => 'الموظفون', 'description' => 'إدارة عقود عمل الموظفين'],

            // ══════════════════════════════════════════════════════
            // 12. التقارير
            // ══════════════════════════════════════════════════════
            ['name' => 'view_sales_report',     'display_name' => 'تقرير المبيعات',   'group' => 'التقارير', 'description' => 'عرض تقارير المبيعات'],
            ['name' => 'view_purchase_report',  'display_name' => 'تقرير المشتريات',  'group' => 'التقارير', 'description' => 'عرض تقارير المشتريات'],
            ['name' => 'view_inventory_report', 'display_name' => 'تقرير المخزون',    'group' => 'التقارير', 'description' => 'عرض تقارير المخزون والحركات'],
            ['name' => 'view_financial_report', 'display_name' => 'التقارير المالية', 'group' => 'التقارير', 'description' => 'عرض التقارير المالية'],
            ['name' => 'view_party_report',     'display_name' => 'تقارير الأطراف',   'group' => 'التقارير', 'description' => 'عرض تقارير العملاء والموردين'],
            ['name' => 'view_dashboard',        'display_name' => 'عرض لوحة التحكم', 'group' => 'التقارير', 'description' => 'الوصول للوحة التحكم والإحصاءات العامة'],

            // ══════════════════════════════════════════════════════
            // 13. السنوات المالية
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_fiscal_year', 'display_name' => 'عرض السنوات المالية', 'group' => 'السنوات المالية', 'description' => 'عرض قائمة السنوات المالية'],
            ['name' => 'manage_fiscal_year',   'display_name' => 'إدارة السنوات المالية','group' => 'السنوات المالية', 'description' => 'إنشاء وتعديل وإقفال السنوات المالية'],

            // ══════════════════════════════════════════════════════
            // 14. الإعدادات
            // ══════════════════════════════════════════════════════
            ['name' => 'manage_settings',    'display_name' => 'إدارة الإعدادات',     'group' => 'الإعدادات', 'description' => 'تعديل إعدادات الشركة العامة'],
            ['name' => 'manage_lookups',     'display_name' => 'إدارة جداول البحث',   'group' => 'الإعدادات', 'description' => 'إدارة العملات، الوحدات، إلخ'],
            ['name' => 'manage_attachments', 'display_name' => 'إدارة المرفقات',      'group' => 'الإعدادات', 'description' => 'رفع وحذف المرفقات'],
            ['name' => 'view_audit_log',     'display_name' => 'عرض سجل المراجعة',   'group' => 'الإعدادات', 'description' => 'عرض سجل العمليات والتعديلات'],

            // ══════════════════════════════════════════════════════
            // 15. الأدوار
            // ══════════════════════════════════════════════════════
            ['name' => 'view_roles',   'display_name' => 'عرض الأدوار',   'group' => 'الأدوار', 'description' => 'عرض الأدوار والصلاحيات المرتبطة'],
            ['name' => 'manage_roles', 'display_name' => 'إدارة الأدوار', 'group' => 'الأدوار', 'description' => 'إنشاء وتعديل وحذف الأدوار وصلاحياتها'],

            // ══════════════════════════════════════════════════════
            // 16. الشركة
            // ══════════════════════════════════════════════════════
            ['name' => 'view_company',           'display_name' => 'عرض الشركة',         'group' => 'الشركة', 'description' => 'عرض بيانات الشركة الحالية'],
            ['name' => 'update_company',         'display_name' => 'تعديل الشركة',        'group' => 'الشركة', 'description' => 'تعديل بيانات الشركة الأساسية'],
            ['name' => 'manage_company_members', 'display_name' => 'إدارة أعضاء الشركة', 'group' => 'الشركة', 'description' => 'إضافة وإزالة الأعضاء وتغيير أدوارهم'],
            ['name' => 'transfer_ownership',     'display_name' => 'نقل ملكية الشركة',   'group' => 'الشركة', 'description' => 'نقل ملكية الشركة لمستخدم آخر'],

            // ══════════════════════════════════════════════════════
            // 17. التنبيهات
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_notification', 'display_name' => 'عرض التنبيهات',  'group' => 'التنبيهات', 'description' => 'عرض قائمة التنبيهات'],
            ['name' => 'manage_notifications',  'display_name' => 'إدارة التنبيهات', 'group' => 'التنبيهات', 'description' => 'إدارة وحذف التنبيهات'],

            // ══════════════════════════════════════════════════════
            // 18. جداول البحث (Lookups)
            // ══════════════════════════════════════════════════════
            ['name' => 'view_any_currency',  'display_name' => 'عرض العملات',   'group' => 'جداول البحث'],
            ['name' => 'create_currency',    'display_name' => 'إنشاء عملة',    'group' => 'جداول البحث'],
            ['name' => 'update_currency',    'display_name' => 'تعديل عملة',    'group' => 'جداول البحث'],
            ['name' => 'delete_currency',    'display_name' => 'حذف عملة',      'group' => 'جداول البحث'],

            ['name' => 'view_any_tva',  'display_name' => 'عرض TVA',   'group' => 'جداول البحث'],
            ['name' => 'create_tva',    'display_name' => 'إنشاء TVA', 'group' => 'جداول البحث'],
            ['name' => 'update_tva',    'display_name' => 'تعديل TVA', 'group' => 'جداول البحث'],
            ['name' => 'delete_tva',    'display_name' => 'حذف TVA',   'group' => 'جداول البحث'],

            ['name' => 'view_any_unit', 'display_name' => 'عرض الوحدات', 'group' => 'جداول البحث'],
            ['name' => 'create_unit',   'display_name' => 'إنشاء وحدة',  'group' => 'جداول البحث'],
            ['name' => 'update_unit',   'display_name' => 'تعديل وحدة',  'group' => 'جداول البحث'],
            ['name' => 'delete_unit',   'display_name' => 'حذف وحدة',    'group' => 'جداول البحث'],

            ['name' => 'view_any_family', 'display_name' => 'عرض العائلات', 'group' => 'جداول البحث'],
            ['name' => 'create_family',   'display_name' => 'إنشاء عائلة',  'group' => 'جداول البحث'],
            ['name' => 'update_family',   'display_name' => 'تعديل عائلة',  'group' => 'جداول البحث'],
            ['name' => 'delete_family',   'display_name' => 'حذف عائلة',    'group' => 'جداول البحث'],

            ['name' => 'view_any_brand', 'display_name' => 'عرض العلامات التجارية', 'group' => 'جداول البحث'],
            ['name' => 'create_brand',   'display_name' => 'إنشاء علامة تجارية',    'group' => 'جداول البحث'],
            ['name' => 'update_brand',   'display_name' => 'تعديل علامة تجارية',    'group' => 'جداول البحث'],
            ['name' => 'delete_brand',   'display_name' => 'حذف علامة تجارية',      'group' => 'جداول البحث'],

            ['name' => 'view_any_price_level', 'display_name' => 'عرض مستويات الأسعار', 'group' => 'جداول البحث'],
            ['name' => 'create_price_level',   'display_name' => 'إنشاء مستوى سعر',     'group' => 'جداول البحث'],
            ['name' => 'update_price_level',   'display_name' => 'تعديل مستوى سعر',     'group' => 'جداول البحث'],
            ['name' => 'delete_price_level',   'display_name' => 'حذف مستوى سعر',       'group' => 'جداول البحث'],

            ['name' => 'view_any_payment_mode', 'display_name' => 'عرض طرق الدفع',   'group' => 'جداول البحث'],
            ['name' => 'create_payment_mode',   'display_name' => 'إنشاء طريقة دفع', 'group' => 'جداول البحث'],
            ['name' => 'update_payment_mode',   'display_name' => 'تعديل طريقة دفع', 'group' => 'جداول البحث'],
            ['name' => 'delete_payment_mode',   'display_name' => 'حذف طريقة دفع',   'group' => 'جداول البحث'],

            ['name' => 'view_any_expense_category', 'display_name' => 'عرض فئات المصروفات', 'group' => 'جداول البحث'],
            ['name' => 'create_expense_category',   'display_name' => 'إنشاء فئة مصروفات',  'group' => 'جداول البحث'],
            ['name' => 'update_expense_category',   'display_name' => 'تعديل فئة مصروفات',  'group' => 'جداول البحث'],
            ['name' => 'delete_expense_category',   'display_name' => 'حذف فئة مصروفات',    'group' => 'جداول البحث'],

            ['name' => 'view_any_exchange_rate', 'display_name' => 'عرض أسعار الصرف', 'group' => 'جداول البحث'],
            ['name' => 'create_exchange_rate',   'display_name' => 'إنشاء سعر صرف',   'group' => 'جداول البحث'],
            ['name' => 'update_exchange_rate',   'display_name' => 'تعديل سعر صرف',   'group' => 'جداول البحث'],
            ['name' => 'delete_exchange_rate',   'display_name' => 'حذف سعر صرف',     'group' => 'جداول البحث'],

            ['name' => 'view_any_document_type', 'display_name' => 'عرض أنواع المستندات', 'group' => 'جداول البحث'],
            ['name' => 'create_document_type',   'display_name' => 'إنشاء نوع مستند',     'group' => 'جداول البحث'],
            ['name' => 'update_document_type',   'display_name' => 'تعديل نوع مستند',     'group' => 'جداول البحث'],
            ['name' => 'delete_document_type',   'display_name' => 'حذف نوع مستند',       'group' => 'جداول البحث'],

            ['name' => 'view_any_document_status', 'display_name' => 'عرض حالات المستندات', 'group' => 'جداول البحث'],
            ['name' => 'create_document_status',   'display_name' => 'إنشاء حالة مستند',    'group' => 'جداول البحث'],
            ['name' => 'update_document_status',   'display_name' => 'تعديل حالة مستند',    'group' => 'جداول البحث'],
            ['name' => 'delete_document_status',   'display_name' => 'حذف حالة مستند',      'group' => 'جداول البحث'],

            ['name' => 'view_any_gender', 'display_name' => 'عرض الجنسين', 'group' => 'جداول البحث'],
            ['name' => 'create_gender',   'display_name' => 'إنشاء جنس',   'group' => 'جداول البحث'],
            ['name' => 'update_gender',   'display_name' => 'تعديل جنس',   'group' => 'جداول البحث'],
            ['name' => 'delete_gender',   'display_name' => 'حذف جنس',     'group' => 'جداول البحث'],

            ['name' => 'view_any_legal_form', 'display_name' => 'عرض الأشكال القانونية', 'group' => 'جداول البحث'],
            ['name' => 'create_legal_form',   'display_name' => 'إنشاء شكل قانوني',      'group' => 'جداول البحث'],
            ['name' => 'update_legal_form',   'display_name' => 'تعديل شكل قانوني',      'group' => 'جداول البحث'],
            ['name' => 'delete_legal_form',   'display_name' => 'حذف شكل قانوني',        'group' => 'جداول البحث'],

            ['name' => 'view_any_party_type', 'display_name' => 'عرض أنواع الأطراف', 'group' => 'جداول البحث'],
            ['name' => 'create_party_type',   'display_name' => 'إنشاء نوع طرف',     'group' => 'جداول البحث'],
            ['name' => 'update_party_type',   'display_name' => 'تعديل نوع طرف',     'group' => 'جداول البحث'],
            ['name' => 'delete_party_type',   'display_name' => 'حذف نوع طرف',       'group' => 'جداول البحث'],

            ['name' => 'view_any_product_type', 'display_name' => 'عرض أنواع المنتجات', 'group' => 'جداول البحث'],
            ['name' => 'create_product_type',   'display_name' => 'إنشاء نوع منتج',     'group' => 'جداول البحث'],
            ['name' => 'update_product_type',   'display_name' => 'تعديل نوع منتج',     'group' => 'جداول البحث'],
            ['name' => 'delete_product_type',   'display_name' => 'حذف نوع منتج',       'group' => 'جداول البحث'],

            ['name' => 'view_any_treasury_account_type', 'display_name' => 'عرض أنواع حسابات الخزينة', 'group' => 'جداول البحث'],
            ['name' => 'create_treasury_account_type',   'display_name' => 'إنشاء نوع حساب خزينة',     'group' => 'جداول البحث'],
            ['name' => 'update_treasury_account_type',   'display_name' => 'تعديل نوع حساب خزينة',     'group' => 'جداول البحث'],
            ['name' => 'delete_treasury_account_type',   'display_name' => 'حذف نوع حساب خزينة',       'group' => 'جداول البحث'],

            ['name' => 'view_any_stock_movement_type', 'display_name' => 'عرض أنواع حركات المخزون', 'group' => 'جداول البحث'],
            ['name' => 'create_stock_movement_type',   'display_name' => 'إنشاء نوع حركة مخزون',    'group' => 'جداول البحث'],
            ['name' => 'update_stock_movement_type',   'display_name' => 'تعديل نوع حركة مخزون',    'group' => 'جداول البحث'],
            ['name' => 'delete_stock_movement_type',   'display_name' => 'حذف نوع حركة مخزون',      'group' => 'جداول البحث'],

            ['name' => 'view_any_inventory_valuation_method', 'display_name' => 'عرض طرق تقييم المخزون', 'group' => 'جداول البحث'],
            ['name' => 'create_inventory_valuation_method',   'display_name' => 'إنشاء طريقة تقييم',     'group' => 'جداول البحث'],
            ['name' => 'update_inventory_valuation_method',   'display_name' => 'تعديل طريقة تقييم',     'group' => 'جداول البحث'],
            ['name' => 'delete_inventory_valuation_method',   'display_name' => 'حذف طريقة تقييم',       'group' => 'جداول البحث'],
        ];
    }
}




// ===== ملف: StockMovementTypeSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StockMovementTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('stock_movement_types')->insert([
            ['company_id' => $companyId, 'name' => 'in', 'label' => 'وارد', 'description' => 'دخول المخزون', 'direction' => 1, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'out', 'label' => 'صادر', 'description' => 'خروج المخزون', 'direction' => -1, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'adjustment', 'label' => 'تسوية', 'description' => 'تسوية يدوية', 'direction' => 0, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}




// ===== ملف: TreasuryAccountSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TreasuryAccountSeeder extends Seeder
{
    public function run(): void
    {
        $companyId  = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $currencyId = DB::table('currencies')->where('company_id', $companyId)->where('code', 'DZD')->value('id');
        $bankTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'bank')->value('id');
        $cashTypeId = DB::table('treasury_account_types')->where('company_id', $companyId)->where('name', 'cash')->value('id');

        DB::table('treasury_accounts')->insert([
            [
                'company_id'               => $companyId,
                'name'                     => 'الصندوق الرئيسي',
                'code'                     => 'CASH01',
                'treasury_account_type_id' => $cashTypeId,
                'bank_name'                => null,           // ← مهم
                'account_number'           => null,           // ← مهم
                'currency_id'              => $currencyId,
                'initial_balance'          => 0.00,
                'current_balance'          => 0.00,
                'is_default'               => true,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
            [
                'company_id'               => $companyId,
                'name'                     => 'البنك الوطني الجزائري',
                'code'                     => 'BNA710',
                'treasury_account_type_id' => $bankTypeId,
                'bank_name'                => 'BNA',
                'account_number'           => '00123456789',  // نص وليس عدد
                'currency_id'              => $currencyId,
                'initial_balance'          => 0.00,
                'current_balance'          => 0.00,
                'is_default'               => false,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ]);
    }
}



// ===== ملف: TreasuryAccountTypeSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TreasuryAccountTypeSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('treasury_account_types')->insert([
            ['company_id' => $companyId, 'name' => 'bank', 'label' => 'حساب بنكي', 'description' => 'حساب جاري لدى بنك', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'cash', 'label' => 'صندوق نقدي', 'description' => 'الخزنة النقدية', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('tvas')->upsert([
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 0%',
                'rate'          => 0.00,
                'description'   => 'معفى من الضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => false,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 9%',
                'rate'          => 9.00,
                'description'   => 'المعدل المخفض للضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => false,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'TVA 19%',
                'rate'          => 19.00,
                'description'   => 'المعدل العادي للضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ], ['company_id', 'name', 'rate']); // المفتاح الفريد المركب
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->first()?->id;

        $units = [
            ['name' => 'Unité',       'symbol' => 'UN',  'description' => 'وحدة'],
            ['name' => 'Pièce',       'symbol' => 'PC',  'description' => 'قطعة'],
            ['name' => 'Boîte',       'symbol' => 'BTE', 'description' => 'علبة'],
            ['name' => 'Carton',      'symbol' => 'CTN', 'description' => 'كرتون'],
            ['name' => 'Fardeau',     'symbol' => 'FD',  'description' => 'حزمة'],
            ['name' => 'Palette',     'symbol' => 'PLT', 'description' => 'باليطة'],
            ['name' => 'Kilogramme',  'symbol' => 'KG',  'description' => 'كيلوغرام'],
            ['name' => 'Gramme',      'symbol' => 'G',   'description' => 'غرام'],
            ['name' => 'Tonne',       'symbol' => 'T',   'description' => 'طن'],
            ['name' => 'Litre',       'symbol' => 'L',   'description' => 'لتر'],
            ['name' => 'Mètre',       'symbol' => 'M',   'description' => 'متر'],
            ['name' => 'Mètre carré', 'symbol' => 'M²',  'description' => 'متر مربع'],
            ['name' => 'Mètre cube',  'symbol' => 'M³',  'description' => 'متر مكعب'],
        ];

        $order = 1;
        foreach ($units as $unit) {
            DB::table('units')->upsert(
                [
                    'company_id' => $companyId,
                    'name' => $unit['name'],
                    'symbol' => $unit['symbol'],
                    'description' => $unit['description'],
                    'active' => true,
                    'display_order' => $order++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                ['company_id', 'name'], // المفتاح الفريد
                ['symbol', 'description', 'active', 'display_order', 'updated_at']
            );
        }
    }
}




// ===== ملف: UserSeeder.php =====
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. التأكد من وجود الأدوار أولاً في قاعدة البيانات
        // (خطوة احتياطية في حال لم يتم تشغيل RolesAndPermissionsSeeder)
        $superAdminRole = Role::firstOrCreate(['name' => User::ROLE_SUPER_ADMIN, 'guard_name' => 'web']);
        $adminRole      = Role::firstOrCreate(['name' => User::ROLE_ADMIN, 'guard_name' => 'web']);

        // 2. إنشاء Super Admin
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@mail.com'],
            [
                'name'              => 'Super Admin',
                'password'          => 'password', // التشفير يتم تلقائياً عبر الـ Model Cast
                'active'            => true,
                'email_verified_at' => now(),
            ]
        );

        // إسناد الدور (assignRole تمسح الأدوار القديمة وتضع الجديد أو تضيفه حسب الإعداد)
        if (!$superAdmin->hasRole(User::ROLE_SUPER_ADMIN)) {
            $superAdmin->assignRole($superAdminRole);
        }

        // 3. إنشاء Admin User
        $adminUser = User::updateOrCreate(
            ['email' => 'admin.user@mail.com'],
            [
                'name'              => 'Admin User',
                'password'          => 'password',
                'active'            => true,
                'email_verified_at' => now(),
            ]
        );

        if (!$adminUser->hasRole(User::ROLE_ADMIN)) {
            $adminUser->assignRole($adminRole);
        }
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
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $wilayaId  = DB::table('wilayas')->where('code', 39)->value('id');

        DB::table('warehouses')->insert([
            'company_id'   => $companyId,
            'name'         => 'Dépôt Principal',
            'code'         => 'DP01',
            'address'      => 'Zgoum, Eloued',
            'wilaya_id'    => $wilayaId,
            'phone'        => '029123456',
            'manager_name' => 'ABDESSADOK',
            'activity'     => 'Stockage et distribution',
            'active'       => true,
            'created_at'   => now(),
            'updated_at'   => now(),
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
 *
 * ✅ مصحح: إزالة $this->command->info() التي تتسبب بخطأ عند الاستدعاء من API
 *    لأن $this->command تكون null خارج سياق CLI (artisan db:seed)
 */
class WilayaCommuneSeeder extends Seeder
{
    /**
     * النقطة الرئيسية لتشغيل الـ Seeder.
     */
    public function run(): void
    {
        // تعطيل فحص المفاتيح الخارجية مؤقتاً لتنظيف الجداول
        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('communes')) {
            DB::table('communes')->truncate();
        }

        if (Schema::hasTable('wilayas')) {
            DB::table('wilayas')->truncate();
        }

        Schema::enableForeignKeyConstraints();

        // 1. إدخال الولايات أولاً
        $this->seedWilayas();

        // 2. إدخال البلديات (تعتمد على الولايات)
        $this->seedCommunes();
    }

    // ===================================================================
    //  1. دالة إدخال الولايات
    // ===================================================================
    private function seedWilayas(): void
    {
        if (!Schema::hasTable('wilayas')) {
            return;
        }

        $jsonPath = database_path('seeders/data/wilayas.json');
        if (!File::exists($jsonPath)) {
            throw new \RuntimeException("ملف البيانات 'wilayas.json' غير موجود في المسار: " . $jsonPath);
        }

        $wilayas = json_decode(File::get($jsonPath));

        if (is_null($wilayas)) {
            throw new \RuntimeException("خطأ في قراءة ملف 'wilayas.json'. تأكد أن صيغة JSON صحيحة.");
        }

        $data = [];
        foreach ($wilayas as $wilaya) {
            $data[] = [
                'code'        => $wilaya->code,
                'name'        => $wilaya->name,
                'arabic_name' => $wilaya->arabic_name,
                'active'      => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }

        DB::table('wilayas')->insert($data);

        // ✅ للـ CLI فقط: طباعة النتيجة إن كان السياق artisan
        $this->log(count($data) . " ولاية تم إضافتها بنجاح.");
    }

    // ===================================================================
    //  2. دالة إدخال البلديات
    // ===================================================================
    private function seedCommunes(): void
    {
        if (!Schema::hasTable('communes')) {
            return;
        }

        if (!Schema::hasTable('wilayas') || DB::table('wilayas')->count() === 0) {
            throw new \RuntimeException("جدول 'wilayas' فارغ. لا يمكن إدخال البلديات.");
        }

        // جلب كل الولايات مرة واحدة وربطها برمزها
        $wilayas = DB::table('wilayas')->pluck('id', 'code');

        $jsonPath = database_path('seeders/data/communes.json');
        if (!File::exists($jsonPath)) {
            throw new \RuntimeException("ملف البيانات 'communes.json' غير موجود في المسار: " . $jsonPath);
        }

        $communes = json_decode(File::get($jsonPath));

        if (is_null($communes)) {
            throw new \RuntimeException("خطأ في قراءة ملف 'communes.json'. تأكد أن صيغة JSON صحيحة.");
        }

        $data         = [];
        $skippedCount = 0;

        foreach ($communes as $commune) {
            $wilayaId = $wilayas->get($commune->wilaya_id);

            if ($wilayaId) {
                $data[] = [
                    'name'        => $commune->name,
                    'arabic_name' => $commune->arabic_name,
                    'post_code'   => $commune->post_code,
                    'wilaya_id'   => $wilayaId,
                    'active'      => true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            } else {
                $skippedCount++;
            }
        }

        // إدراج جميع البلديات دفعة واحدة
        DB::table('communes')->insert($data);

        $this->log(count($data) . " بلدية تم إضافتها بنجاح." .
            ($skippedCount > 0 ? " (تم تخطي {$skippedCount} بلدية)" : ""));
    }

    /**
     * ✅ طباعة آمنة — تعمل في CLI فقط، تُهمَل عند الاستدعاء من API
     */
    private function log(string $message): void
    {
        if (isset($this->command) && $this->command !== null) {
            $this->command->info($message);
        }
    }
}


