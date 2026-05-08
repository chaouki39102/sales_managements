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
<<<<<<< HEAD
        $legalFormId = DB::table('legal_forms')->where('code', 'EURL')->value('id');
        $wilayaId    = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي
=======
        $wilayaId = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي

        // جلب المستخدم الأول الذي أُنشئ في UserSeeder
        $superAdminId = DB::table('users')->where('email', 'admin@mail.com')->value('id');
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

        $companyId = DB::table('companies')->insertGetId([
            'name'            => 'Mon Entreprise',
            'commercial_name' => 'Mon Entreprise',
            'slug'            => 'mon-entreprise',
            'activity'        => 'Commerce et distribution',
            'nif'             => '000000000000000',
<<<<<<< HEAD
            'legal_form_id'   => $legalFormId,
            'wilaya_id'       => $wilayaId,
            'phone'           => '032000000',
            'email'           => 'contact@monentreprise.dz',
=======
            'wilaya_id'       => $wilayaId,
            'phone'           => '032000000',
            'email'           => 'contact@monentreprise.dz',
            'owner_id'        => $superAdminId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
            'is_active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

<<<<<<< HEAD
        // ربط المستخدم super-admin بالشركة
        $superAdminId = DB::table('users')->where('email', 'admin@mail.com')->value('id');

=======
        // ضبط company_id في config لاستخدامه في Seeders اللاحقة
        config(['seeding.company_id' => $companyId]);

        // ربط المستخدمين بالشركة عبر company_user
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        if ($superAdminId) {
            DB::table('company_user')->insert([
                'company_id' => $companyId,
                'user_id'    => $superAdminId,
                'is_default' => true,
<<<<<<< HEAD
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // تعيين owner_id
            DB::table('companies')
                ->where('id', $companyId)
                ->update(['owner_id' => $superAdminId]);
=======
                'role'       => 'super-admin',
                'joined_at'  => now(),
                'is_active'  => true,
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
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        }
    }
}




<<<<<<< HEAD

=======
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
// ===== ملف: CurrencySeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        DB::table('currencies')->upsert([
            [
                'name'            => 'Dinar Algérien',
                'code'            => 'DZD',
                'symbol'          => 'د.ج',
                'decimal_places'  => 2,
                'is_base_currency' => true,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now()
            ],
            [
                'name'            => 'Euro',
                'code'            => 'EUR',
                'symbol'          => '€',
                'decimal_places'  => 2,
                'is_base_currency' => false,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now()
            ],
            [
                'name'            => 'US Dollar',
                'code'            => 'USD',
                'symbol'          => '$',
                'decimal_places'  => 2,
                'is_base_currency' => false,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now()
            ],
        ], ['code']); // unique column
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('currencies')->insert([
            [
                'company_id'       => $companyId,
                'name'             => 'Dinar Algérien',
                'code'             => 'DZD',
                'symbol'           => 'د.ج',
                'decimal_places'   => 2,
                'is_base_currency' => true,
                'is_active'        => true,
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
                'is_active'        => true,
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
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}




// ===== ملف: DatabaseSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
<<<<<<< HEAD
    /**
     * نقطة البداية لتشغيل جميع الـ Seeders بالترتيب الصحيح
     *
     * القاعدة: البيانات الثابتة التي في المهاجر (party_types, product_types,
     * stock_movement_types, treasury_account_types) لا تُعاد هنا.
     * الـ Seeders هنا فقط للبيانات التي ليست في المهاجر.
     */
    public function run(): void
    {
        // ═══════════════════════════════════════════════════════════
        // المرحلة 1: جداول Lookup المستقلة (لا تعتمد على شركة أو مستخدم)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            GenderSeeder::class,                      // genders
            CurrencySeeder::class,                    // currencies
            TvaSeeder::class,                         // tvas
            UnitSeeder::class,                        // units
            LegalFormSeeder::class,                   // legal_forms
            FiscalStampSeeder::class,                 // fiscal_stamps
            InventoryValuationMethodSeeder::class,    // inventory_valuation_methods
            DocumentBaseOperationSeeder::class,       // document_base_operations
            DocumentStatusSeeder::class,              // document_statuses
            PriceLevelSeeder::class,                  // price_levels
            ExpenseCategorySeeder::class,             // expense_categories
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 2: البيانات الجغرافية (ولاية + بلدية)
=======
    public function run(): void
    {
        // ═══════════════════════════════════════════════════════════
        // المرحلة 1: البيانات الجغرافية (مستقلة تماماً)
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WilayaCommuneSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
<<<<<<< HEAD
        // المرحلة 3: الصلاحيات والأدوار (تعريفها قبل المستخدمين)
=======
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
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 5: الصلاحيات والأدوار (بعد الشركة)
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
<<<<<<< HEAD
        // المرحلة 4: الشركة (بدون owner_id في البداية)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            CompanySeeder::class,   // يقوم بإنشاء شركة واحدة وتخزين معرفها في cache
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 5: المستخدمين (لا يحتاجون company_id)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            UserSeeder::class,      // ينشئ المستخدمين (super-admin, admin)
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 7: السنة المالية (تحتاج company_id)
=======
        // المرحلة 6: السنة المالية
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            FiscalYearSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
<<<<<<< HEAD
        // المرحلة 8: المستودعات (تحتاج company_id + wilaya)
=======
        // المرحلة 7: المستودعات
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WarehouseSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
<<<<<<< HEAD
        // المرحلة 9: حسابات الخزينة وطرق الدفع (تحتاج company_id + عملة)
=======
        // المرحلة 8: الخزينة وطرق الدفع
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
<<<<<<< HEAD
        // المرحلة 10: أنواع المستندات وسلاسل الترقيم
=======
        // المرحلة 9: أنواع المستندات وسلاسل الترقيم
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            DocumentTypeSeeder::class,
            NumberingSeriesSeeder::class,
        ]);
<<<<<<< HEAD

        // ═══════════════════════════════════════════════════════════
        // ملاحظة: أي سيدرات أخرى (ExpenseSeeder، ProductSeeder، ...)
        // يمكن إضافتها في مراحل لاحقة بعد اكتمال البنية الأساسية.
        // ═══════════════════════════════════════════════════════════
=======
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('document_base_operations')->upsert([
            ['name' => 'sale',       'label' => 'مبيعات',   'description' => 'عمليات البيع للعملاء', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'purchase',   'label' => 'مشتريات',  'description' => 'عمليات الشراء من الموردين', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'transfer',   'label' => 'نقل',      'description' => 'نقل المخزون بين المستودعات', 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'adjustment', 'label' => 'تعديل',    'description' => 'تعديلات المخزون', 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
        ], ['name']);
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('document_base_operations')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'sale',
                'label'         => 'مبيعات',
                'description'   => 'عمليات البيع للعملاء',
                'is_active'     => true,
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'purchase',
                'label'         => 'مشتريات',
                'description'   => 'عمليات الشراء من الموردين',
                'is_active'     => true,
                'display_order' => 2,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'transfer',
                'label'         => 'نقل',
                'description'   => 'نقل المخزون بين المستودعات',
                'is_active'     => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'company_id'    => $companyId,
                'name'          => 'adjustment',
                'label'         => 'تعديل',
                'description'   => 'تعديلات المخزون',
                'is_active'     => true,
                'display_order' => 4,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('document_statuses')->upsert([
            ['name' => 'draft',          'label' => 'مسودة',          'color' => 'gray',    'created_at' => now(), 'updated_at' => now()],
            ['name' => 'pending',        'label' => 'قيد الانتظار',   'color' => 'yellow',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'validated',      'label' => 'معتمد',          'color' => 'blue',    'created_at' => now(), 'updated_at' => now()],
            ['name' => 'partially_paid', 'label' => 'مدفوع جزئياً',   'color' => 'orange',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'paid',           'label' => 'مدفوع',          'color' => 'green',   'created_at' => now(), 'updated_at' => now()],
            ['name' => 'overdue',        'label' => 'متأخر',          'color' => 'red',     'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cancelled',      'label' => 'ملغي',           'color' => 'red',     'created_at' => now(), 'updated_at' => now()],
            ['name' => 'returned',       'label' => 'مرتجع',          'color' => 'purple',  'created_at' => now(), 'updated_at' => now()],
        ], ['name']);
=======
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
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        $sale     = DB::table('document_base_operations')->where('name', 'sale')->value('id');
        $purchase = DB::table('document_base_operations')->where('name', 'purchase')->value('id');
        $transfer = DB::table('document_base_operations')->where('name', 'transfer')->value('id');

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
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}




// ===== ملف: ExpenseCategorySeeder.php =====
namespace Database\Seeders;

<<<<<<< HEAD
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 4. ExpenseCategorySeeder (فئات المصاريف)
 * ═══════════════════════════════════════════════════════════════════
 */
=======
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
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
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('expense_categories')->insert([
            ['company_id' => $companyId, 'name' => 'مصاريف الموظفين', 'code' => 'STAFF', 'description' => 'رواتب، أجور، تأمينات اجتماعية', 'parent_id' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف النقل',    'code' => 'TRANS', 'description' => 'شحن، نقل بضائع، محروقات',        'parent_id' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف إدارية',  'code' => 'ADMIN', 'description' => 'كهرباء، ماء، هاتف، إيجار',        'parent_id' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'مصاريف تسويق',   'code' => 'MRKT',  'description' => 'إعلانات، دعاية، عروض ترويجية',    'parent_id' => null, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('fiscal_stamps')->upsert([
            [
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('fiscal_stamps')->insert([
            [
                'company_id'   => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
=======
                'company_id'   => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
=======
                'company_id'   => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        ], ['name']);
=======
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}




// ===== ملف: FiscalYearSeeder.php =====
namespace Database\Seeders;

<<<<<<< HEAD
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
=======
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = Carbon::now()->year;
<<<<<<< HEAD
        $companyId   = DB::table('companies')->first()->id;

        DB::table('fiscal_years')->insert([
            'company_id'  => $companyId,
            'name'        => "Exercice $currentYear",
            'start_date'  => "$currentYear-01-01",
            'end_date'    => "$currentYear-12-31",
            'is_closed'   => false,
            'is_current'  => true,
            'created_at'  => now(),
            'updated_at'  => now(),
=======
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
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('genders')->insert([
            [
                'name'          => 'male',
                'label'         => 'ذكر',
                'active'        => true,
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('genders')->insert([
            [
                'company_id'    => $companyId,
                'name'          => 'male',
                'label'         => 'ذكر',
                'is_active'     => true,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
                'display_order' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
<<<<<<< HEAD
                'name'          => 'female',
                'label'         => 'أنثى',
                'active'        => true,
=======
                'company_id'    => $companyId,
                'name'          => 'female',
                'label'         => 'أنثى',
                'is_active'     => true,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('inventory_valuation_methods')->upsert([
            [
                'name'       => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'     => 'fifo',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'     => 'lifo',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'المتوسط المرجح',
                'method'     => 'weighted_average',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ], ['name']);
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('inventory_valuation_methods')->insert([
            [
                'company_id'  => $companyId,
                'name'        => 'FIFO (الوارد أولاً يصرف أولاً)',
                'method'      => 'fifo',
                'is_default'  => true,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'LIFO (الوارد أخيراً يصرف أولاً)',
                'method'      => 'lifo',
                'is_default'  => false,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'company_id'  => $companyId,
                'name'        => 'المتوسط المرجح',
                'method'      => 'weighted_average',
                'is_default'  => false,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('legal_forms')->upsert([
            ['code' => 'PERSONNE',  'name' => 'Personne Physique - شخص طبيعي', 'description' => 'الشكل القانوني الأكثر شيوعاً في الجزائر', 'requires_capital' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SARL',      'name' => 'Société à Responsabilité Limitée - شركة ذات مسؤولية محدودة', 'description' => 'الشكل القانوني للشركات الأكثر شيوعاً في الجزائر', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EURL',      'name' => 'Entreprise Unipersonnelle à Responsabilité Limitée - مؤسسة فردية ذات مسؤولية محدودة', 'description' => 'شركة فردية بشريك واحد', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SPA',       'name' => 'Société Par Actions - شركة المساهمة', 'description' => 'شركة مساهمة كبيرة', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SNC',       'name' => 'Société en Nom Collectif - شركة التضامن', 'description' => 'جميع الشركاء متضامنون', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SCS',       'name' => 'Société en Commandite Simple - شركة التوصية البسيطة', 'description' => 'شركاء متضامنون وموصون', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EI',        'name' => 'Entreprise Individuelle - مؤسسة فردية', 'description' => 'مؤسسة فردية بدون شخصية معنوية', 'requires_capital' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
        ], ['code']);
=======
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
            DB::table('legal_forms')->insert(array_merge($form, [
                'company_id' => $companyId,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        $companyId   = DB::table('companies')->first()->id;
        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->first()->id;
        $year        = date('Y');

        $documentTypes = DB::table('document_types')->get();
=======
        $companyId   = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->value('id');
        $year        = date('Y');

        $documentTypes = DB::table('document_types')->where('company_id', $companyId)->get();
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

        foreach ($documentTypes as $docType) {
            DB::table('numbering_series')->insert([
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
            ]);
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
<<<<<<< HEAD
        $companyId = DB::table('companies')->value('id');
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->first()->id;
        
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

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




// ===== ملف: PaymentModeSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        // الصندوق الرئيسي — لربط وسيلة الدفع نقداً
        $cashAccountId = DB::table('treasury_accounts')->where('code', 'CASH01')->value('id');

        DB::table('payment_modes')->insert([
            ['name' => 'Espèces',          'code' => 'CASH', 'description' => 'نقداً',          'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Chèque',           'code' => 'CHQ',  'description' => 'شيك',            'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Virement bancaire','code' => 'WIRE', 'description' => 'تحويل بنكي',     'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Carte bancaire',   'code' => 'CARD', 'description' => 'بطاقة بنكية',    'treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Effet de commerce','code' => 'LCR',  'description' => 'سند لأمر',       'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Versement',        'code' => 'VERS', 'description' => 'إيداع بنكي',     'treasury_account_id' => null,           'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 6, 'created_at' => now(), 'updated_at' => now()],
=======
        $companyId    = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $cashAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'CASH01')->value('id');
        $bankAccountId = DB::table('treasury_accounts')->where('company_id', $companyId)->where('code', 'BNA01')->value('id');

        DB::table('payment_modes')->insert([
            ['company_id' => $companyId, 'name' => 'نقداً',         'code' => 'CASH',  'treasury_account_id' => $cashAccountId, 'requires_reference' => false, 'is_cash' => true,  'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'شيك',           'code' => 'CHQ',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'تحويل بنكي',   'code' => 'VIR',   'treasury_account_id' => $bankAccountId, 'requires_reference' => true,  'is_cash' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'بطاقة بنكية',  'code' => 'CB',    'treasury_account_id' => $bankAccountId, 'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'دفع آجل',      'code' => 'CREDIT','treasury_account_id' => null,           'requires_reference' => false, 'is_cash' => false, 'active' => true, 'display_order' => 5, 'created_at' => now(), 'updated_at' => now()],
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('price_levels')->insert([
            [
                'name' => 'Prix de détail',
                'description' => 'سعر التجزئة',
                'is_default' => true,
                'active' => true,
                'display_order' => 1,
                'is_percentage' => false,
                'value' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix de gros',
                'description' => 'سعر الجملة',
                'is_default' => false,
                'active' => true,
                'display_order' => 2,
                'is_percentage' => true,
                'value' => -10.00, // خصم 10%
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix semi-gros',
                'description' => 'سعر نصف الجملة',
                'is_default' => false,
                'active' => true,
                'display_order' => 3,
                'is_percentage' => true,
                'value' => -20.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Prix spécial',
                'description' => 'سعر خاص',
                'is_default' => false,
                'active' => true,
                'display_order' => 4,
                'is_percentage' => false,
                'value' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('price_levels')->insert([
            ['company_id' => $companyId, 'name' => 'Tarif Détail',     'description' => 'سعر التجزئة',     'is_default' => true,  'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Demi-Gros',  'description' => 'سعر نصف الجملة',  'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $companyId, 'name' => 'Tarif Gros',       'description' => 'سعر الجملة',      'is_default' => false, 'is_percentage' => false, 'value' => null, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        ]);
    }
}




// ===== ملف: RolesAndPermissionsSeeder.php =====
namespace Database\Seeders;

use Illuminate\Database\Seeder;
<<<<<<< HEAD
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * RolesAndPermissionsSeeder — النسخة الشاملة
 *
 * الأدوار:
 *  ① super-admin   → مدير النظام الكامل (فوق كل شيء — Gate::before)
 *  ② admin         → مدير الشركة (كل صلاحيات الشركة)
 *  ③ manager       → مدير عمليات (مبيعات + مشتريات + مخزون + تقارير)
 *  ④ accountant    → محاسب (مستندات + مدفوعات + تقارير مالية)
 *  ⑤ salesperson   → بائع (مستندات بيع + عملاء + مخزون قراءة)
 *  ⑥ warehouse     → أمين مخزن (مخزون + حركات فقط)
 *  ⑦ viewer        → مشاهد (قراءة فقط — لا كتابة)
 *
 * المجموعات:
 *  - المستخدمون      - الأطراف         - المنتجات
 *  - المستودعات      - المستندات       - المدفوعات
 *  - الشيكات         - المصروفات       - الخزينة
 *  - المخزون         - الموظفون        - التقارير
 *  - الإعدادات       - الأدوار         - الشركة
 */
class RolesAndPermissionsSeeder extends Seeder
{
    // ═══════════════════════════════════════════
    // تعريف كل الصلاحيات مجمّعة
    // ═══════════════════════════════════════════
    private function getPermissions(): array
    {
        return [

            // ══════════════════════════════════
            // 1. المستخدمون
            // ══════════════════════════════════
           
            [
                'name'         => 'view_any_user',
                'display_name' => 'عرض قائمة المستخدمين',
                'group'        => 'المستخدمون',
                'description'  => 'عرض قائمة جميع مستخدمي الشركة',
            ],
            [
                'name'         => 'view_user',
                'display_name' => 'عرض مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'عرض تفاصيل مستخدم واحد',
            ],
            [
                'name'         => 'create_user',
                'display_name' => 'إنشاء مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'إضافة مستخدم جديد للشركة',
            ],
            [
                'name'         => 'update_user',
                'display_name' => 'تعديل مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تعديل بيانات مستخدم موجود',
            ],
            [
                'name'         => 'delete_user',
                'display_name' => 'حذف مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'حذف مستخدم من الشركة (حذف مؤقت)',
            ],
            [
                'name'         => 'restore_user',
                'display_name' => 'استعادة مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'استعادة مستخدم محذوف',
            ],
            [
                'name'         => 'force_delete_user',
                'display_name' => 'حذف نهائي لمستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'الحذف النهائي غير القابل للاستعادة',
            ],
            [
                'name'         => 'toggle_active_user',
                'display_name' => 'تفعيل/تعطيل مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تفعيل أو تعطيل حساب مستخدم',
            ],
            [
                'name'         => 'change_password_user',
                'display_name' => 'تغيير كلمة مرور مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تغيير كلمة مرور أي مستخدم',
            ],
            [
                'name'         => 'assign_role_user',
                'display_name' => 'تعيين دور لمستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تعيين أو تغيير دور مستخدم في الشركة',
            ],

            // ══════════════════════════════════
            // 2. الأطراف (عملاء / موردون)
            // ══════════════════════════════════
            [
                'name'         => 'view_any_party',
                'display_name' => 'عرض قائمة الأطراف',
                'group'        => 'الأطراف',
                'description'  => 'عرض قائمة العملاء والموردين',
            ],
            [
                'name'         => 'view_party',
                'display_name' => 'عرض طرف',
                'group'        => 'الأطراف',
                'description'  => 'عرض تفاصيل عميل أو مورد',
            ],
            [
                'name'         => 'create_party',
                'display_name' => 'إنشاء طرف',
                'group'        => 'الأطراف',
                'description'  => 'إضافة عميل أو مورد جديد',
            ],
            [
                'name'         => 'update_party',
                'display_name' => 'تعديل طرف',
                'group'        => 'الأطراف',
                'description'  => 'تعديل بيانات عميل أو مورد',
            ],
            [
                'name'         => 'delete_party',
                'display_name' => 'حذف طرف',
                'group'        => 'الأطراف',
                'description'  => 'حذف عميل أو مورد',
            ],
            [
                'name'         => 'restore_party',
                'display_name' => 'استعادة طرف',
                'group'        => 'الأطراف',
                'description'  => 'استعادة عميل أو مورد محذوف',
            ],
            [
                'name'         => 'force_delete_party',
                'display_name' => 'حذف نهائي لطرف',
                'group'        => 'الأطراف',
                'description'  => 'الحذف النهائي لعميل أو مورد',
            ],

            // ══════════════════════════════════
            // 3. المنتجات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_product',
                'display_name' => 'عرض قائمة المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'عرض قائمة جميع المنتجات',
            ],
            [
                'name'         => 'view_product',
                'display_name' => 'عرض منتج',
                'group'        => 'المنتجات',
                'description'  => 'عرض تفاصيل منتج واحد',
            ],
            [
                'name'         => 'create_product',
                'display_name' => 'إنشاء منتج',
                'group'        => 'المنتجات',
                'description'  => 'إضافة منتج جديد',
            ],
            [
                'name'         => 'update_product',
                'display_name' => 'تعديل منتج',
                'group'        => 'المنتجات',
                'description'  => 'تعديل بيانات منتج موجود',
            ],
            [
                'name'         => 'delete_product',
                'display_name' => 'حذف منتج',
                'group'        => 'المنتجات',
                'description'  => 'حذف منتج',
            ],
            [
                'name'         => 'restore_product',
                'display_name' => 'استعادة منتج',
                'group'        => 'المنتجات',
                'description'  => 'استعادة منتج محذوف',
            ],
            [
                'name'         => 'manage_product_prices',
                'display_name' => 'إدارة أسعار المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'تعديل أسعار المنتجات وتعريفاتها',
            ],
            [
                'name'         => 'manage_product_variants',
                'display_name' => 'إدارة متغيرات المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'إدارة متغيرات وتعبئة المنتجات',
            ],
            [
                'name'         => 'manage_barcodes',
                'display_name' => 'إدارة الباركود',
                'group'        => 'المنتجات',
                'description'  => 'إضافة وتعديل وحذف الباركود',
            ],

            // ══════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_warehouse',
                'display_name' => 'عرض قائمة المستودعات',
                'group'        => 'المستودعات',
                'description'  => 'عرض قائمة جميع المستودعات',
            ],
            [
                'name'         => 'view_warehouse',
                'display_name' => 'عرض مستودع',
                'group'        => 'المستودعات',
                'description'  => 'عرض تفاصيل مستودع',
            ],
            [
                'name'         => 'create_warehouse',
                'display_name' => 'إنشاء مستودع',
                'group'        => 'المستودعات',
                'description'  => 'إضافة مستودع جديد',
            ],
            [
                'name'         => 'update_warehouse',
                'display_name' => 'تعديل مستودع',
                'group'        => 'المستودعات',
                'description'  => 'تعديل بيانات مستودع',
            ],
            [
                'name'         => 'delete_warehouse',
                'display_name' => 'حذف مستودع',
                'group'        => 'المستودعات',
                'description'  => 'حذف مستودع',
            ],

            // ══════════════════════════════════
            // 5. المستندات التجارية
            // ══════════════════════════════════
            [
                'name'         => 'view_any_commercial_document',
                'display_name' => 'عرض قائمة المستندات',
                'group'        => 'المستندات',
                'description'  => 'عرض قائمة جميع المستندات التجارية',
            ],
            [
                'name'         => 'view_commercial_document',
                'display_name' => 'عرض مستند',
                'group'        => 'المستندات',
                'description'  => 'عرض تفاصيل مستند تجاري',
            ],
            [
                'name'         => 'create_sales_document',
                'display_name' => 'إنشاء مستند بيع',
                'group'        => 'المستندات',
                'description'  => 'إنشاء فاتورة بيع أو عرض سعر أو وصل تسليم',
            ],
            [
                'name'         => 'create_purchase_document',
                'display_name' => 'إنشاء مستند شراء',
                'group'        => 'المستندات',
                'description'  => 'إنشاء فاتورة شراء أو أمر شراء',
            ],
            [
                'name'         => 'update_commercial_document',
                'display_name' => 'تعديل مستند',
                'group'        => 'المستندات',
                'description'  => 'تعديل مستند تجاري غير مؤكد',
            ],
            [
                'name'         => 'delete_commercial_document',
                'display_name' => 'حذف مستند',
                'group'        => 'المستندات',
                'description'  => 'حذف مستند تجاري',
            ],
            [
                'name'         => 'validate_commercial_document',
                'display_name' => 'تأكيد مستند',
                'group'        => 'المستندات',
                'description'  => 'تأكيد وإقفال مستند تجاري',
            ],
            [
                'name'         => 'lock_commercial_document',
                'display_name' => 'قفل/فتح مستند',
                'group'        => 'المستندات',
                'description'  => 'قفل أو فتح مستند تجاري',
            ],
            [
                'name'         => 'cancel_commercial_document',
                'display_name' => 'إلغاء مستند',
                'group'        => 'المستندات',
                'description'  => 'إلغاء مستند تجاري',
            ],
            [
                'name'         => 'manage_numbering_series',
                'display_name' => 'إدارة سلاسل الترقيم',
                'group'        => 'المستندات',
                'description'  => 'إدارة سلاسل ترقيم المستندات',
            ],

            // ══════════════════════════════════
            // 6. المدفوعات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_payment',
                'display_name' => 'عرض قائمة المدفوعات',
                'group'        => 'المدفوعات',
                'description'  => 'عرض قائمة جميع المدفوعات',
            ],
            [
                'name'         => 'view_payment',
                'display_name' => 'عرض دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'عرض تفاصيل دفعة واحدة',
            ],
            [
                'name'         => 'create_payment',
                'display_name' => 'إنشاء دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'تسجيل دفعة جديدة',
            ],
            [
                'name'         => 'update_payment',
                'display_name' => 'تعديل دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'تعديل بيانات دفعة',
            ],
            [
                'name'         => 'delete_payment',
                'display_name' => 'حذف دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'حذف دفعة',
            ],

            // ══════════════════════════════════
            // 7. الشيكات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_check',
                'display_name' => 'عرض قائمة الشيكات',
                'group'        => 'الشيكات',
                'description'  => 'عرض قائمة جميع الشيكات',
            ],
            [
                'name'         => 'view_check',
                'display_name' => 'عرض شيك',
                'group'        => 'الشيكات',
                'description'  => 'عرض تفاصيل شيك',
            ],
            [
                'name'         => 'create_check',
                'display_name' => 'إنشاء شيك',
                'group'        => 'الشيكات',
                'description'  => 'تسجيل شيك جديد',
            ],
            [
                'name'         => 'update_check',
                'display_name' => 'تعديل شيك',
                'group'        => 'الشيكات',
                'description'  => 'تعديل بيانات شيك',
            ],
            [
                'name'         => 'delete_check',
                'display_name' => 'حذف شيك',
                'group'        => 'الشيكات',
                'description'  => 'حذف شيك',
            ],
            [
                'name'         => 'manage_check_status',
                'display_name' => 'إدارة حالة الشيكات',
                'group'        => 'الشيكات',
                'description'  => 'تحديث حالة الشيك (صُرف / مرتجع)',
            ],

            // ══════════════════════════════════
            // 8. المصروفات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_expense',
                'display_name' => 'عرض قائمة المصروفات',
                'group'        => 'المصروفات',
                'description'  => 'عرض قائمة جميع المصروفات',
            ],
            [
                'name'         => 'view_expense',
                'display_name' => 'عرض مصروف',
                'group'        => 'المصروفات',
                'description'  => 'عرض تفاصيل مصروف',
            ],
            [
                'name'         => 'create_expense',
                'display_name' => 'إنشاء مصروف',
                'group'        => 'المصروفات',
                'description'  => 'تسجيل مصروف جديد',
            ],
            [
                'name'         => 'update_expense',
                'display_name' => 'تعديل مصروف',
                'group'        => 'المصروفات',
                'description'  => 'تعديل بيانات مصروف',
            ],
            [
                'name'         => 'delete_expense',
                'display_name' => 'حذف مصروف',
                'group'        => 'المصروفات',
                'description'  => 'حذف مصروف',
            ],

            // ══════════════════════════════════
            // 9. الخزينة
            // ══════════════════════════════════
            [
                'name'         => 'view_any_treasury_account',
                'display_name' => 'عرض قائمة حسابات الخزينة',
                'group'        => 'الخزينة',
                'description'  => 'عرض قائمة جميع حسابات الخزينة والبنوك',
            ],
            [
                'name'         => 'view_treasury_account',
                'display_name' => 'عرض حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'عرض تفاصيل حساب خزينة',
            ],
            [
                'name'         => 'create_treasury_account',
                'display_name' => 'إنشاء حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'إضافة حساب خزينة أو بنك جديد',
            ],
            [
                'name'         => 'update_treasury_account',
                'display_name' => 'تعديل حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'تعديل بيانات حساب خزينة',
            ],
            [
                'name'         => 'delete_treasury_account',
                'display_name' => 'حذف حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'حذف حساب خزينة',
            ],

            // ══════════════════════════════════
            // 10. المخزون وحركاته
            // ══════════════════════════════════
            [
                'name'         => 'view_any_stock_movement',
                'display_name' => 'عرض حركات المخزون',
                'group'        => 'المخزون',
                'description'  => 'عرض قائمة حركات المخزون',
            ],
            [
                'name'         => 'view_stock_movement',
                'display_name' => 'عرض حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'عرض تفاصيل حركة مخزون',
            ],
            [
                'name'         => 'create_stock_movement',
                'display_name' => 'إنشاء حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'تسجيل حركة مخزون يدوية',
            ],
            [
                'name'         => 'delete_stock_movement',
                'display_name' => 'حذف حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'حذف حركة مخزون',
            ],
            [
                'name'         => 'view_any_product_lot',
                'display_name' => 'عرض دفعات المنتجات',
                'group'        => 'المخزون',
                'description'  => 'عرض قائمة دفعات (Lots) المنتجات',
            ],
            [
                'name'         => 'manage_product_lot',
                'display_name' => 'إدارة دفعات المنتجات',
                'group'        => 'المخزون',
                'description'  => 'إضافة وتعديل وحذف دفعات المنتجات',
            ],
            [
                'name'         => 'manage_opening_balances',
                'display_name' => 'إدارة الأرصدة الافتتاحية',
                'group'        => 'المخزون',
                'description'  => 'إدارة أرصدة المخزون والأطراف الافتتاحية',
            ],

            // ══════════════════════════════════
            // 11. الموظفون
            // ══════════════════════════════════
            [
                'name'         => 'view_any_employee',
                'display_name' => 'عرض قائمة الموظفين',
                'group'        => 'الموظفون',
                'description'  => 'عرض قائمة جميع الموظفين',
            ],
            [
                'name'         => 'view_employee',
                'display_name' => 'عرض موظف',
                'group'        => 'الموظفون',
                'description'  => 'عرض تفاصيل موظف',
            ],
            [
                'name'         => 'create_employee',
                'display_name' => 'إنشاء موظف',
                'group'        => 'الموظفون',
                'description'  => 'إضافة موظف جديد',
            ],
            [
                'name'         => 'update_employee',
                'display_name' => 'تعديل موظف',
                'group'        => 'الموظفون',
                'description'  => 'تعديل بيانات موظف',
            ],
            [
                'name'         => 'delete_employee',
                'display_name' => 'حذف موظف',
                'group'        => 'الموظفون',
                'description'  => 'حذف موظف',
            ],
            [
                'name'         => 'manage_employment_contracts',
                'display_name' => 'إدارة عقود العمل',
                'group'        => 'الموظفون',
                'description'  => 'إدارة عقود عمل الموظفين',
            ],

            // ══════════════════════════════════
            // 12. التقارير
            // ══════════════════════════════════
            [
                'name'         => 'view_sales_report',
                'display_name' => 'تقرير المبيعات',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المبيعات',
            ],
            [
                'name'         => 'view_purchase_report',
                'display_name' => 'تقرير المشتريات',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المشتريات',
            ],
            [
                'name'         => 'view_inventory_report',
                'display_name' => 'تقرير المخزون',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المخزون والحركات',
            ],
            [
                'name'         => 'view_financial_report',
                'display_name' => 'التقارير المالية',
                'group'        => 'التقارير',
                'description'  => 'عرض التقارير المالية (مدفوعات، ضرائب، خزينة)',
            ],
            [
                'name'         => 'view_party_report',
                'display_name' => 'تقارير الأطراف',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير العملاء والموردين',
            ],
            [
                'name'         => 'view_dashboard',
                'display_name' => 'عرض لوحة التحكم',
                'group'        => 'التقارير',
                'description'  => 'الوصول للوحة التحكم والإحصاءات العامة',
            ],

            // ══════════════════════════════════
            // 13. السنوات المالية
            // ══════════════════════════════════
            [
                'name'         => 'view_any_fiscal_year',
                'display_name' => 'عرض السنوات المالية',
                'group'        => 'السنوات المالية',
                'description'  => 'عرض قائمة السنوات المالية',
            ],
            [
                'name'         => 'manage_fiscal_year',
                'display_name' => 'إدارة السنوات المالية',
                'group'        => 'السنوات المالية',
                'description'  => 'إنشاء وتعديل وإقفال السنوات المالية',
            ],

            // ══════════════════════════════════
            // 14. الإعدادات
            // ══════════════════════════════════
            [
                'name'         => 'manage_settings',
                'display_name' => 'إدارة الإعدادات',
                'group'        => 'الإعدادات',
                'description'  => 'تعديل إعدادات الشركة العامة',
            ],
            [
                'name'         => 'manage_lookups',
                'display_name' => 'إدارة جداول البحث',
                'group'        => 'الإعدادات',
                'description'  => 'إدارة العملات، الوحدات، أصناف المصروفات، إلخ',
            ],
            [
                'name'         => 'manage_attachments',
                'display_name' => 'إدارة المرفقات',
                'group'        => 'الإعدادات',
                'description'  => 'رفع وحذف المرفقات',
            ],
            [
                'name'         => 'view_audit_log',
                'display_name' => 'عرض سجل المراجعة',
                'group'        => 'الإعدادات',
                'description'  => 'عرض سجل العمليات والتعديلات',
            ],

            // ══════════════════════════════════
            // 15. الأدوار والصلاحيات
            // ══════════════════════════════════
            [
                'name'         => 'view_roles',
                'display_name' => 'عرض الأدوار',
                'group'        => 'الأدوار',
                'description'  => 'عرض الأدوار والصلاحيات المرتبطة',
            ],
            [
                'name'         => 'manage_roles',
                'display_name' => 'إدارة الأدوار',
                'group'        => 'الأدوار',
                'description'  => 'إنشاء وتعديل وحذف الأدوار وصلاحياتها',
            ],

            // ══════════════════════════════════
            // 16. الشركة
            // ══════════════════════════════════
            [
                'name'         => 'view_company',
                'display_name' => 'عرض الشركة',
                'group'        => 'الشركة',
                'description'  => 'عرض بيانات الشركة الحالية',
            ],
            [
                'name'         => 'update_company',
                'display_name' => 'تعديل الشركة',
                'group'        => 'الشركة',
                'description'  => 'تعديل بيانات الشركة الأساسية',
            ],
            [
                'name'         => 'manage_company_members',
                'display_name' => 'إدارة أعضاء الشركة',
                'group'        => 'الشركة',
                'description'  => 'إضافة وإزالة الأعضاء وتغيير أدوارهم',
            ],
            [
                'name'         => 'transfer_ownership',
                'display_name' => 'نقل ملكية الشركة',
                'group'        => 'الشركة',
                'description'  => 'نقل ملكية الشركة لمستخدم آخر',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // تعريف صلاحيات كل دور
    // ═══════════════════════════════════════════

    private function getRolePermissions(): array
    {
        return [

            // ── admin: كل صلاحيات الشركة ────────────────────────
            'admin' => [
                // مستخدمون
                'view_any_user', 'view_user', 'create_user', 'update_user',
                'delete_user', 'restore_user', 'force_delete_user',
                'toggle_active_user', 'change_password_user', 'assign_role_user',
                // أطراف
                'view_any_party', 'view_party', 'create_party', 'update_party',
                'delete_party', 'restore_party', 'force_delete_party',
                // منتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'restore_product', 'manage_product_prices',
                'manage_product_variants', 'manage_barcodes',
                // مستودعات
                'view_any_warehouse', 'view_warehouse', 'create_warehouse',
                'update_warehouse', 'delete_warehouse',
                // مستندات
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'manage_numbering_series',
                // مدفوعات
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // شيكات
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // مصروفات
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // خزينة
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account', 'delete_treasury_account',
                // مخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'delete_stock_movement', 'view_any_product_lot', 'manage_product_lot',
                'manage_opening_balances',
                // موظفون
                'view_any_employee', 'view_employee', 'create_employee', 'update_employee',
                'delete_employee', 'manage_employment_contracts',
                // تقارير
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // سنوات مالية
                'view_any_fiscal_year', 'manage_fiscal_year',
                // إعدادات
                'manage_settings', 'manage_lookups', 'manage_attachments', 'view_audit_log',
                // أدوار
                'view_roles', 'manage_roles',
                // شركة
                'view_company', 'update_company', 'manage_company_members', 'transfer_ownership',
            ],

            // ── manager: عمليات بدون إدارة مستخدمين وإعدادات ────
            'manager' => [
                // مستخدمون (قراءة فقط)
                'view_any_user', 'view_user',
                // أطراف (كاملة)
                'view_any_party', 'view_party', 'create_party', 'update_party', 'delete_party',
                // منتجات (كاملة)
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'manage_product_prices', 'manage_product_variants', 'manage_barcodes',
                // مستودعات (قراءة + تعديل)
                'view_any_warehouse', 'view_warehouse', 'update_warehouse',
                // مستندات (كاملة)
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document',
                // مدفوعات
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment',
                // شيكات
                'view_any_check', 'view_check', 'create_check', 'update_check', 'manage_check_status',
                // مصروفات
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense',
                // خزينة (قراءة)
                'view_any_treasury_account', 'view_treasury_account',
                // مخزون (كاملة)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // موظفون (قراءة)
                'view_any_employee', 'view_employee',
                // تقارير (كاملة)
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // سنوات مالية (قراءة)
                'view_any_fiscal_year',
                // إعدادات
                'manage_lookups', 'manage_attachments',
                // أدوار (قراءة)
                'view_roles',
                // شركة (قراءة)
                'view_company',
            ],

            // ── accountant: مالي بحت ─────────────────────────────
            'accountant' => [
                // أطراف (قراءة)
                'view_any_party', 'view_party',
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات (قراءة + تأكيد)
                'view_any_commercial_document', 'view_commercial_document',
                'validate_commercial_document',
                // مدفوعات (كاملة)
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment', 'delete_payment',
                // شيكات (كاملة)
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // مصروفات (كاملة)
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense', 'delete_expense',
                // خزينة (كاملة)
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                // مخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                // تقارير مالية
                'view_sales_report', 'view_purchase_report', 'view_financial_report',
                'view_party_report', 'view_dashboard',
                // سنوات مالية (قراءة)
                'view_any_fiscal_year',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── salesperson: بيع فقط ─────────────────────────────
            'salesperson' => [
                // أطراف (عملاء: قراءة + إنشاء)
                'view_any_party', 'view_party', 'create_party', 'update_party',
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات بيع فقط
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'update_commercial_document',
                // مدفوعات (قراءة + إنشاء)
                'view_any_payment', 'view_payment', 'create_payment',
                // مخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement',
                // تقارير مبيعات
                'view_sales_report', 'view_party_report', 'view_dashboard',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── warehouse: أمين مخزن ─────────────────────────────
            'warehouse' => [
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات (قراءة)
                'view_any_commercial_document', 'view_commercial_document',
                // مخزون (كاملة)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // تقارير مخزون
                'view_inventory_report', 'view_dashboard',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── viewer: مشاهد فقط ────────────────────────────────
            'viewer' => [
                'view_any_party', 'view_party',
                'view_any_product', 'view_product',
                'view_any_warehouse', 'view_warehouse',
                'view_any_commercial_document', 'view_commercial_document',
                'view_any_payment', 'view_payment',
                'view_any_check', 'view_check',
                'view_any_expense', 'view_expense',
                'view_any_treasury_account', 'view_treasury_account',
                'view_any_stock_movement', 'view_stock_movement',
                'view_any_product_lot',
                'view_any_employee', 'view_employee',
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                'view_any_fiscal_year',
                'view_roles',
                'view_company',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // تعريف الأدوار مع بياناتها
    // ═══════════════════════════════════════════
    private function getRoles(): array
    {
        return [
            [
                'name'         => 'super-admin',
                'display_name' => 'مدير النظام',
                'description'  => 'صلاحيات كاملة على كل شيء — يتجاوز كل القيود (Gate::before)',
            ],
            [
                'name'         => 'admin',
                'display_name' => 'مدير الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'محاسب',
                'description'  => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية',
            ],
            [
                'name'         => 'salesperson',
                'display_name' => 'بائع',
                'description'  => 'إنشاء مستندات البيع وإدارة العملاء',
            ],
            [
                'name'         => 'warehouse',
                'display_name' => 'أمين المخزن',
                'description'  => 'إدارة المخزون وحركاته',
            ],
            [
                'name'         => 'viewer',
                'display_name' => 'مشاهد',
                'description'  => 'قراءة فقط بدون أي صلاحيات كتابة',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // run()
    // ═══════════════════════════════════════════
    public function run(): void
    {
        // 1. مسح كاش الصلاحيات
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. إنشاء الصلاحيات
        $permissions = $this->getPermissions();
        foreach ($permissions as $perm) {
            if (!is_array($perm) || !isset($perm['name'])) continue;
            Permission::firstOrCreate(
                ['name' => $perm['name'], 'guard_name' => 'web'],
=======
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id');

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. إنشاء الصلاحيات (عالمية: company_id = null)
        foreach ($this->getPermissions() as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm['name'], 'guard_name' => 'web', 'company_id' => null],
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
                [
                    'display_name' => $perm['display_name'] ?? $perm['name'],
                    'group'        => $perm['group'] ?? 'عام',
                    'description'  => $perm['description'] ?? '',
                ]
            );
        }

        $this->command->info('✅ تم إنشاء ' . Permission::count() . ' صلاحية');

<<<<<<< HEAD
        // 3. إنشاء الأدوار
        foreach ($this->getRoles() as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name'], 'guard_name' => 'web'],
                [
                    'display_name' => $roleData['display_name'],
                    'description'  => $roleData['description'] ?? '',
                ]
=======
        // 2. إنشاء الأدوار
        foreach ($this->getRoles() as $roleData) {
            $isSuperAdmin  = $roleData['name'] === 'super-admin';
            $roleCompanyId = $isSuperAdmin ? null : $companyId;

            Role::firstOrCreate(
                ['name' => $roleData['name'], 'guard_name' => 'web', 'company_id' => $roleCompanyId],
                ['display_name' => $roleData['display_name'], 'description' => $roleData['description'] ?? '']
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
            );
        }

        $this->command->info('✅ تم إنشاء ' . Role::count() . ' أدوار');

<<<<<<< HEAD
        // 4. تعيين الصلاحيات للأدوار
        $rolePermissions = $this->getRolePermissions();

        // super-admin يأخذ كل الصلاحيات
        Role::where('name', 'super-admin')->first()
            ?->syncPermissions(Permission::all());

        // باقي الأدوار
        foreach ($rolePermissions as $roleName => $permNames) {
            if ($roleName === 'super-admin') continue;

            $role = Role::where('name', $roleName)->first();
            if (!$role) continue;

            // نجلب الصلاحيات الموجودة فعلاً (نتجاهل أي اسم غير موجود)
            $existingPerms = Permission::whereIn('name', $permNames)->get();
            $role->syncPermissions($existingPerms);

            $this->command->line("  ↳ {$role->display_name}: {$existingPerms->count()} صلاحية");
        }

        // 5. مسح الكاش مجدداً
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('');
        $this->command->info('🎉 اكتمل الـ Seeder بنجاح!');
        $this->command->table(
            ['الدور', 'عدد الصلاحيات'],
            Role::all()->map(fn($r) => [$r->display_name ?? $r->name, $r->permissions->count()])
        );
=======
        // 3. تعيين الصلاحيات للأدوار
        $allPerms = Permission::whereNull('company_id')->get();

        Role::where('name', 'super-admin')->whereNull('company_id')->first()
            ?->syncPermissions($allPerms);

        foreach ($this->getRolePermissions() as $roleName => $permNames) {
            if ($roleName === 'super-admin') {
                continue;
            }

            $role = Role::where('name', $roleName)->where('company_id', $companyId)->first();
            if (!$role) {
                continue;
            }

            $perms = Permission::whereIn('name', $permNames)->whereNull('company_id')->get();
            $role->syncPermissions($perms);
            $this->command->line("  ↳ {$role->display_name}: {$perms->count()} صلاحية");
        }

        // 4. تعيين الأدوار للمستخدمين
        $superAdmin = \App\Models\User::where('email', 'admin@mail.com')->first();
        $superAdmin?->assignRole('super-admin');

        $admin = \App\Models\User::where('email', 'admin.user@mail.com')->first();
        $admin?->assignRole(Role::where('name', 'admin')->where('company_id', $companyId)->first());

        // 5. مسح الكاش
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command->info('🎉 اكتمل الـ Seeder بنجاح!');
    }

    private function getPermissions(): array
    {
        return [
            // 1. المستخدمون
            ['name' => 'view_any_user',       'display_name' => 'عرض قائمة المستخدمين',      'group' => 'المستخدمون', 'description' => 'عرض قائمة جميع مستخدمي الشركة'],
            ['name' => 'view_user',           'display_name' => 'عرض مستخدم',               'group' => 'المستخدمون', 'description' => 'عرض تفاصيل مستخدم واحد'],
            ['name' => 'create_user',         'display_name' => 'إنشاء مستخدم',             'group' => 'المستخدمون', 'description' => 'إضافة مستخدم جديد للشركة'],
            ['name' => 'update_user',         'display_name' => 'تعديل مستخدم',             'group' => 'المستخدمون', 'description' => 'تعديل بيانات مستخدم موجود'],
            ['name' => 'delete_user',         'display_name' => 'حذف مستخدم',               'group' => 'المستخدمون', 'description' => 'حذف مستخدم من الشركة'],
            ['name' => 'restore_user',        'display_name' => 'استعادة مستخدم',           'group' => 'المستخدمون', 'description' => 'استعادة مستخدم محذوف'],
            ['name' => 'force_delete_user',   'display_name' => 'حذف نهائي لمستخدم',        'group' => 'المستخدمون', 'description' => 'الحذف النهائي لمستخدم'],
            ['name' => 'toggle_active_user',  'display_name' => 'تفعيل/تعطيل مستخدم',       'group' => 'المستخدمون', 'description' => 'تغيير حالة تفعيل المستخدم'],
            ['name' => 'change_password_user','display_name' => 'تغيير كلمة مرور مستخدم',   'group' => 'المستخدمون', 'description' => 'تغيير كلمة مرور مستخدم آخر'],
            ['name' => 'assign_role_user',    'display_name' => 'تعيين دور لمستخدم',        'group' => 'المستخدمون', 'description' => 'تغيير دور مستخدم داخل الشركة'],
            // 2. الأطراف
            ['name' => 'view_any_party',      'display_name' => 'عرض قائمة الأطراف',        'group' => 'الأطراف',    'description' => 'عرض قائمة العملاء والموردين'],
            ['name' => 'view_party',          'display_name' => 'عرض طرف',                  'group' => 'الأطراف',    'description' => 'عرض تفاصيل عميل أو مورد'],
            ['name' => 'create_party',        'display_name' => 'إنشاء طرف',                'group' => 'الأطراف',    'description' => 'إضافة عميل أو مورد جديد'],
            ['name' => 'update_party',        'display_name' => 'تعديل طرف',                'group' => 'الأطراف',    'description' => 'تعديل بيانات عميل أو مورد'],
            ['name' => 'delete_party',        'display_name' => 'حذف طرف',                  'group' => 'الأطراف',    'description' => 'حذف عميل أو مورد'],
            ['name' => 'restore_party',       'display_name' => 'استعادة طرف',              'group' => 'الأطراف',    'description' => 'استعادة عميل أو مورد محذوف'],
            ['name' => 'force_delete_party',  'display_name' => 'حذف نهائي لطرف',           'group' => 'الأطراف',    'description' => 'الحذف النهائي لعميل أو مورد'],
            // 3. المنتجات
            ['name' => 'view_any_product',         'display_name' => 'عرض قائمة المنتجات',      'group' => 'المنتجات',   'description' => 'عرض قائمة جميع المنتجات'],
            ['name' => 'view_product',             'display_name' => 'عرض منتج',                'group' => 'المنتجات',   'description' => 'عرض تفاصيل منتج واحد'],
            ['name' => 'create_product',           'display_name' => 'إنشاء منتج',              'group' => 'المنتجات',   'description' => 'إضافة منتج جديد'],
            ['name' => 'update_product',           'display_name' => 'تعديل منتج',              'group' => 'المنتجات',   'description' => 'تعديل بيانات منتج موجود'],
            ['name' => 'delete_product',           'display_name' => 'حذف منتج',                'group' => 'المنتجات',   'description' => 'حذف منتج'],
            ['name' => 'restore_product',          'display_name' => 'استعادة منتج',            'group' => 'المنتجات',   'description' => 'استعادة منتج محذوف'],
            ['name' => 'manage_product_prices',    'display_name' => 'إدارة أسعار المنتجات',    'group' => 'المنتجات',   'description' => 'تعديل أسعار المنتجات وتعريفاتها'],
            ['name' => 'manage_product_variants',  'display_name' => 'إدارة متغيرات المنتجات',  'group' => 'المنتجات',   'description' => 'إدارة متغيرات وتعبئة المنتجات'],
            ['name' => 'manage_barcodes',          'display_name' => 'إدارة الباركود',           'group' => 'المنتجات',   'description' => 'إضافة وتعديل وحذف الباركود'],
            // 4. المستودعات
            ['name' => 'view_any_warehouse', 'display_name' => 'عرض قائمة المستودعات', 'group' => 'المستودعات', 'description' => 'عرض قائمة جميع المستودعات'],
            ['name' => 'view_warehouse',     'display_name' => 'عرض مستودع',           'group' => 'المستودعات', 'description' => 'عرض تفاصيل مستودع'],
            ['name' => 'create_warehouse',   'display_name' => 'إنشاء مستودع',         'group' => 'المستودعات', 'description' => 'إضافة مستودع جديد'],
            ['name' => 'update_warehouse',   'display_name' => 'تعديل مستودع',         'group' => 'المستودعات', 'description' => 'تعديل بيانات مستودع'],
            ['name' => 'delete_warehouse',   'display_name' => 'حذف مستودع',           'group' => 'المستودعات', 'description' => 'حذف مستودع'],
            // 5. المستندات التجارية
            ['name' => 'view_any_commercial_document', 'display_name' => 'عرض قائمة المستندات',    'group' => 'المستندات', 'description' => 'عرض قائمة جميع المستندات التجارية'],
            ['name' => 'view_commercial_document',     'display_name' => 'عرض مستند',              'group' => 'المستندات', 'description' => 'عرض تفاصيل مستند تجاري'],
            ['name' => 'create_sales_document',        'display_name' => 'إنشاء مستند بيع',        'group' => 'المستندات', 'description' => 'إنشاء فاتورة بيع أو عرض سعر'],
            ['name' => 'create_purchase_document',     'display_name' => 'إنشاء مستند شراء',       'group' => 'المستندات', 'description' => 'إنشاء فاتورة شراء أو أمر شراء'],
            ['name' => 'update_commercial_document',   'display_name' => 'تعديل مستند',            'group' => 'المستندات', 'description' => 'تعديل مستند تجاري غير مؤكد'],
            ['name' => 'delete_commercial_document',   'display_name' => 'حذف مستند',              'group' => 'المستندات', 'description' => 'حذف مستند تجاري'],
            ['name' => 'validate_commercial_document', 'display_name' => 'تأكيد مستند',            'group' => 'المستندات', 'description' => 'تأكيد وإقفال مستند تجاري'],
            ['name' => 'lock_commercial_document',     'display_name' => 'قفل/فتح مستند',          'group' => 'المستندات', 'description' => 'قفل أو فتح مستند تجاري'],
            ['name' => 'cancel_commercial_document',   'display_name' => 'إلغاء مستند',            'group' => 'المستندات', 'description' => 'إلغاء مستند تجاري'],
            ['name' => 'manage_numbering_series',      'display_name' => 'إدارة سلاسل الترقيم',    'group' => 'المستندات', 'description' => 'إدارة سلاسل ترقيم المستندات'],
            // 6. المدفوعات
            ['name' => 'view_any_payment', 'display_name' => 'عرض قائمة المدفوعات', 'group' => 'المدفوعات', 'description' => 'عرض قائمة جميع المدفوعات'],
            ['name' => 'view_payment',     'display_name' => 'عرض دفعة',            'group' => 'المدفوعات', 'description' => 'عرض تفاصيل دفعة واحدة'],
            ['name' => 'create_payment',   'display_name' => 'إنشاء دفعة',          'group' => 'المدفوعات', 'description' => 'تسجيل دفعة جديدة'],
            ['name' => 'update_payment',   'display_name' => 'تعديل دفعة',          'group' => 'المدفوعات', 'description' => 'تعديل بيانات دفعة'],
            ['name' => 'delete_payment',   'display_name' => 'حذف دفعة',            'group' => 'المدفوعات', 'description' => 'حذف دفعة'],
            // 7. الشيكات
            ['name' => 'view_any_check',    'display_name' => 'عرض قائمة الشيكات',    'group' => 'الشيكات', 'description' => 'عرض قائمة جميع الشيكات'],
            ['name' => 'view_check',        'display_name' => 'عرض شيك',              'group' => 'الشيكات', 'description' => 'عرض تفاصيل شيك'],
            ['name' => 'create_check',      'display_name' => 'إنشاء شيك',            'group' => 'الشيكات', 'description' => 'تسجيل شيك جديد'],
            ['name' => 'update_check',      'display_name' => 'تعديل شيك',            'group' => 'الشيكات', 'description' => 'تعديل بيانات شيك'],
            ['name' => 'delete_check',      'display_name' => 'حذف شيك',              'group' => 'الشيكات', 'description' => 'حذف شيك'],
            ['name' => 'manage_check_status','display_name' => 'إدارة حالة الشيكات', 'group' => 'الشيكات', 'description' => 'تحديث حالة الشيك'],
            // 8. المصروفات
            ['name' => 'view_any_expense', 'display_name' => 'عرض قائمة المصروفات', 'group' => 'المصروفات', 'description' => 'عرض قائمة جميع المصروفات'],
            ['name' => 'view_expense',     'display_name' => 'عرض مصروف',           'group' => 'المصروفات', 'description' => 'عرض تفاصيل مصروف'],
            ['name' => 'create_expense',   'display_name' => 'إنشاء مصروف',         'group' => 'المصروفات', 'description' => 'تسجيل مصروف جديد'],
            ['name' => 'update_expense',   'display_name' => 'تعديل مصروف',         'group' => 'المصروفات', 'description' => 'تعديل بيانات مصروف'],
            ['name' => 'delete_expense',   'display_name' => 'حذف مصروف',           'group' => 'المصروفات', 'description' => 'حذف مصروف'],
            // 9. الخزينة
            ['name' => 'view_any_treasury_account', 'display_name' => 'عرض قائمة حسابات الخزينة', 'group' => 'الخزينة', 'description' => 'عرض قائمة جميع حسابات الخزينة والبنوك'],
            ['name' => 'view_treasury_account',     'display_name' => 'عرض حساب خزينة',           'group' => 'الخزينة', 'description' => 'عرض تفاصيل حساب خزينة'],
            ['name' => 'create_treasury_account',   'display_name' => 'إنشاء حساب خزينة',         'group' => 'الخزينة', 'description' => 'إضافة حساب خزينة أو بنك جديد'],
            ['name' => 'update_treasury_account',   'display_name' => 'تعديل حساب خزينة',         'group' => 'الخزينة', 'description' => 'تعديل بيانات حساب خزينة'],
            ['name' => 'delete_treasury_account',   'display_name' => 'حذف حساب خزينة',           'group' => 'الخزينة', 'description' => 'حذف حساب خزينة'],
            // 10. المخزون
            ['name' => 'view_any_stock_movement', 'display_name' => 'عرض حركات المخزون',      'group' => 'المخزون', 'description' => 'عرض قائمة حركات المخزون'],
            ['name' => 'view_stock_movement',     'display_name' => 'عرض حركة مخزون',        'group' => 'المخزون', 'description' => 'عرض تفاصيل حركة مخزون'],
            ['name' => 'create_stock_movement',   'display_name' => 'إنشاء حركة مخزون',      'group' => 'المخزون', 'description' => 'تسجيل حركة مخزون يدوية'],
            ['name' => 'delete_stock_movement',   'display_name' => 'حذف حركة مخزون',        'group' => 'المخزون', 'description' => 'حذف حركة مخزون'],
            ['name' => 'view_any_product_lot',    'display_name' => 'عرض دفعات المنتجات',    'group' => 'المخزون', 'description' => 'عرض قائمة دفعات المنتجات'],
            ['name' => 'manage_product_lot',      'display_name' => 'إدارة دفعات المنتجات',  'group' => 'المخزون', 'description' => 'إضافة وتعديل وحذف دفعات المنتجات'],
            ['name' => 'manage_opening_balances', 'display_name' => 'إدارة الأرصدة الافتتاحية','group' => 'المخزون', 'description' => 'إدارة أرصدة المخزون والأطراف الافتتاحية'],
            // 11. الموظفون
            ['name' => 'view_any_employee',          'display_name' => 'عرض قائمة الموظفين',  'group' => 'الموظفون', 'description' => 'عرض قائمة جميع الموظفين'],
            ['name' => 'view_employee',              'display_name' => 'عرض موظف',            'group' => 'الموظفون', 'description' => 'عرض تفاصيل موظف'],
            ['name' => 'create_employee',            'display_name' => 'إنشاء موظف',          'group' => 'الموظفون', 'description' => 'إضافة موظف جديد'],
            ['name' => 'update_employee',            'display_name' => 'تعديل موظف',          'group' => 'الموظفون', 'description' => 'تعديل بيانات موظف'],
            ['name' => 'delete_employee',            'display_name' => 'حذف موظف',            'group' => 'الموظفون', 'description' => 'حذف موظف'],
            ['name' => 'manage_employment_contracts','display_name' => 'إدارة عقود العمل',    'group' => 'الموظفون', 'description' => 'إدارة عقود عمل الموظفين'],
            // 12. التقارير
            ['name' => 'view_sales_report',     'display_name' => 'تقرير المبيعات',    'group' => 'التقارير', 'description' => 'عرض تقارير المبيعات'],
            ['name' => 'view_purchase_report',  'display_name' => 'تقرير المشتريات',   'group' => 'التقارير', 'description' => 'عرض تقارير المشتريات'],
            ['name' => 'view_inventory_report', 'display_name' => 'تقرير المخزون',     'group' => 'التقارير', 'description' => 'عرض تقارير المخزون والحركات'],
            ['name' => 'view_financial_report', 'display_name' => 'التقارير المالية',  'group' => 'التقارير', 'description' => 'عرض التقارير المالية'],
            ['name' => 'view_party_report',     'display_name' => 'تقارير الأطراف',    'group' => 'التقارير', 'description' => 'عرض تقارير العملاء والموردين'],
            ['name' => 'view_dashboard',        'display_name' => 'عرض لوحة التحكم',  'group' => 'التقارير', 'description' => 'الوصول للوحة التحكم والإحصاءات العامة'],
            // 13. السنوات المالية
            ['name' => 'view_any_fiscal_year', 'display_name' => 'عرض السنوات المالية', 'group' => 'السنوات المالية', 'description' => 'عرض قائمة السنوات المالية'],
            ['name' => 'manage_fiscal_year',   'display_name' => 'إدارة السنوات المالية','group' => 'السنوات المالية', 'description' => 'إنشاء وتعديل وإقفال السنوات المالية'],
            // 14. الإعدادات
            ['name' => 'manage_settings',    'display_name' => 'إدارة الإعدادات',       'group' => 'الإعدادات', 'description' => 'تعديل إعدادات الشركة العامة'],
            ['name' => 'manage_lookups',     'display_name' => 'إدارة جداول البحث',     'group' => 'الإعدادات', 'description' => 'إدارة العملات، الوحدات، إلخ'],
            ['name' => 'manage_attachments', 'display_name' => 'إدارة المرفقات',        'group' => 'الإعدادات', 'description' => 'رفع وحذف المرفقات'],
            ['name' => 'view_audit_log',     'display_name' => 'عرض سجل المراجعة',     'group' => 'الإعدادات', 'description' => 'عرض سجل العمليات والتعديلات'],
            // 15. الأدوار
            ['name' => 'view_roles',   'display_name' => 'عرض الأدوار',   'group' => 'الأدوار', 'description' => 'عرض الأدوار والصلاحيات المرتبطة'],
            ['name' => 'manage_roles', 'display_name' => 'إدارة الأدوار', 'group' => 'الأدوار', 'description' => 'إنشاء وتعديل وحذف الأدوار وصلاحياتها'],
            // 16. الشركة
            ['name' => 'view_company',           'display_name' => 'عرض الشركة',         'group' => 'الشركة', 'description' => 'عرض بيانات الشركة الحالية'],
            ['name' => 'update_company',         'display_name' => 'تعديل الشركة',        'group' => 'الشركة', 'description' => 'تعديل بيانات الشركة الأساسية'],
            ['name' => 'manage_company_members', 'display_name' => 'إدارة أعضاء الشركة', 'group' => 'الشركة', 'description' => 'إضافة وإزالة الأعضاء وتغيير أدوارهم'],
            ['name' => 'transfer_ownership',     'display_name' => 'نقل ملكية الشركة',   'group' => 'الشركة', 'description' => 'نقل ملكية الشركة لمستخدم آخر'],
        ];
    }

    private function getRoles(): array
    {
        return [
            ['name' => 'super-admin', 'display_name' => 'مدير النظام',     'description' => 'صلاحيات كاملة على كل شيء'],
            ['name' => 'admin',       'display_name' => 'مدير الشركة',     'description' => 'إدارة كاملة لجميع بيانات وموارد الشركة'],
            ['name' => 'manager',     'display_name' => 'مدير العمليات',   'description' => 'إدارة المبيعات والمشتريات والمخزون والتقارير'],
            ['name' => 'accountant',  'display_name' => 'محاسب',           'description' => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية'],
            ['name' => 'salesperson', 'display_name' => 'بائع',            'description' => 'إنشاء مستندات البيع وإدارة العملاء'],
            ['name' => 'warehouse',   'display_name' => 'أمين المخزن',     'description' => 'إدارة المخزون وحركاته'],
            ['name' => 'viewer',      'display_name' => 'مشاهد',           'description' => 'قراءة فقط بدون أي صلاحيات كتابة'],
        ];
    }

    private function getRolePermissions(): array
    {
        return [
            'admin' => [
                'view_any_user','view_user','create_user','update_user','delete_user','restore_user','force_delete_user','toggle_active_user','change_password_user','assign_role_user',
                'view_any_party','view_party','create_party','update_party','delete_party','restore_party','force_delete_party',
                'view_any_product','view_product','create_product','update_product','delete_product','restore_product','manage_product_prices','manage_product_variants','manage_barcodes',
                'view_any_warehouse','view_warehouse','create_warehouse','update_warehouse','delete_warehouse',
                'view_any_commercial_document','view_commercial_document','create_sales_document','create_purchase_document','update_commercial_document','delete_commercial_document','validate_commercial_document','lock_commercial_document','cancel_commercial_document','manage_numbering_series',
                'view_any_payment','view_payment','create_payment','update_payment','delete_payment',
                'view_any_check','view_check','create_check','update_check','delete_check','manage_check_status',
                'view_any_expense','view_expense','create_expense','update_expense','delete_expense',
                'view_any_treasury_account','view_treasury_account','create_treasury_account','update_treasury_account','delete_treasury_account',
                'view_any_stock_movement','view_stock_movement','create_stock_movement','delete_stock_movement','view_any_product_lot','manage_product_lot','manage_opening_balances',
                'view_any_employee','view_employee','create_employee','update_employee','delete_employee','manage_employment_contracts',
                'view_sales_report','view_purchase_report','view_inventory_report','view_financial_report','view_party_report','view_dashboard',
                'view_any_fiscal_year','manage_fiscal_year',
                'manage_settings','manage_lookups','manage_attachments','view_audit_log',
                'view_roles','manage_roles',
                'view_company','update_company','manage_company_members','transfer_ownership',
            ],
            'manager' => [
                'view_any_user','view_user',
                'view_any_party','view_party','create_party','update_party','delete_party',
                'view_any_product','view_product','create_product','update_product','delete_product','manage_product_prices','manage_product_variants','manage_barcodes',
                'view_any_warehouse','view_warehouse','update_warehouse',
                'view_any_commercial_document','view_commercial_document','create_sales_document','create_purchase_document','update_commercial_document','delete_commercial_document','validate_commercial_document','lock_commercial_document','cancel_commercial_document',
                'view_any_payment','view_payment','create_payment','update_payment',
                'view_any_check','view_check','create_check','update_check','manage_check_status',
                'view_any_expense','view_expense','create_expense','update_expense',
                'view_any_treasury_account','view_treasury_account',
                'view_any_stock_movement','view_stock_movement','create_stock_movement','view_any_product_lot','manage_product_lot',
                'view_any_employee','view_employee',
                'view_sales_report','view_purchase_report','view_inventory_report','view_financial_report','view_party_report','view_dashboard',
                'view_any_fiscal_year','manage_lookups','manage_attachments','view_roles','view_company',
            ],
            'accountant' => [
                'view_any_party','view_party',
                'view_any_product','view_product',
                'view_any_warehouse','view_warehouse',
                'view_any_commercial_document','view_commercial_document','validate_commercial_document',
                'view_any_payment','view_payment','create_payment','update_payment','delete_payment',
                'view_any_check','view_check','create_check','update_check','delete_check','manage_check_status',
                'view_any_expense','view_expense','create_expense','update_expense','delete_expense',
                'view_any_treasury_account','view_treasury_account','create_treasury_account','update_treasury_account',
                'view_any_stock_movement','view_stock_movement','view_any_product_lot',
                'view_sales_report','view_purchase_report','view_financial_report','view_party_report','view_dashboard',
                'view_any_fiscal_year','manage_attachments','view_company',
            ],
            'salesperson' => [
                'view_any_party','view_party','create_party','update_party',
                'view_any_product','view_product',
                'view_any_warehouse','view_warehouse',
                'view_any_commercial_document','view_commercial_document','create_sales_document','update_commercial_document',
                'view_any_payment','view_payment','create_payment',
                'view_any_stock_movement','view_stock_movement',
                'view_sales_report','view_party_report','view_dashboard',
                'manage_attachments','view_company',
            ],
            'warehouse' => [
                'view_any_product','view_product',
                'view_any_warehouse','view_warehouse',
                'view_any_commercial_document','view_commercial_document',
                'view_any_stock_movement','view_stock_movement','create_stock_movement',
                'view_any_product_lot','manage_product_lot',
                'view_inventory_report','view_dashboard',
                'manage_attachments','view_company',
            ],
            'viewer' => [
                'view_any_party','view_party',
                'view_any_product','view_product',
                'view_any_warehouse','view_warehouse',
                'view_any_commercial_document','view_commercial_document',
                'view_any_payment','view_payment',
                'view_any_check','view_check',
                'view_any_expense','view_expense',
                'view_any_treasury_account','view_treasury_account',
                'view_any_stock_movement','view_stock_movement','view_any_product_lot',
                'view_any_employee','view_employee',
                'view_sales_report','view_purchase_report','view_inventory_report','view_financial_report','view_party_report','view_dashboard',
                'view_any_fiscal_year','view_roles','view_company',
            ],
        ];
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}




// ===== ملف: TreasuryAccountSeeder.php =====
namespace Database\Seeders;

<<<<<<< HEAD
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 3. TreasuryAccountSeeder
 * ═══════════════════════════════════════════════════════════════════
 * مطلوب لجدول payment_modes
 */
=======
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
class TreasuryAccountSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
       $companyId  = 2;
$currencyId = DB::table('currencies')->where('code', 'DZD')->value('id');
$bankTypeId = DB::table('treasury_account_types')->where('name', 'bank')->value('id');
$cashTypeId = DB::table('treasury_account_types')->where('name', 'cash')->value('id');

DB::table('treasury_accounts')->where('company_id', $companyId)->delete();

DB::table('treasury_accounts')->insert([
    'company_id'               => $companyId,
    'name'                     => 'الصندوق الرئيسي',
    'code'                     => 'CASH01',
    'treasury_account_type_id' => $cashTypeId,
    'bank_name'                => null,
    'account_number'           => null,
    'currency_id'              => $currencyId,
    'initial_balance'          => 0.00,
    'current_balance'          => 0.00,
    'is_default'               => true,
    'active'                   => true,
    'created_at'               => now(),
    'updated_at'               => now(),
]);

DB::table('treasury_accounts')->insert([
    'company_id'               => $companyId,
    'name'                     => 'البنك الوطني الجزائري',
    'code'                     => 'BNA01',
    'treasury_account_type_id' => $bankTypeId,
    'bank_name'                => 'BNA',
    'account_number'           => '00123456789',
    'currency_id'              => $currencyId,
    'initial_balance'          => 0.00,
    'current_balance'          => 0.00,
    'is_default'               => false,
    'active'                   => true,
    'created_at'               => now(),
    'updated_at'               => now(),
]);
=======
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
                'account_number'           => '00123456789',
                'currency_id'              => $currencyId,
                'initial_balance'          => 0.00,
                'current_balance'          => 0.00,
                'is_default'               => false,
                'active'                   => true,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        DB::table('tvas')->upsert([
            [
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        DB::table('tvas')->insert([
            [
                'company_id'    => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
=======
                'company_id'    => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
=======
                'company_id'    => $companyId,
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
                'name'          => 'TVA 19%',
                'rate'          => 19.00,
                'description'   => 'المعدل العادي للضريبة على القيمة المضافة',
                'active'        => true,
                'is_default'    => true,
                'display_order' => 3,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
<<<<<<< HEAD
        ], ['name', 'rate']); // unique constraint
=======
        ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        $companyId = config('seeding.company_id'); // null or company id

        $units = [
            ['name' => 'Unité',       'symbol' => 'UN',  'description' => 'وحدة'],
            ['name' => 'Pièce',       'symbol' => 'PC',  'description' => 'قطعة'],
            ['name' => 'Boîte',       'symbol' => 'BTE', 'description' => 'علبة'],
            ['name' => 'Carton',      'symbol' => 'CTN', 'description' => 'كرتون'],
            ['name' => 'Palette',     'symbol' => 'PLT', 'description' => 'باليطة'],
            ['name' => 'Kilogramme',  'symbol' => 'KG',  'description' => 'كيلوغرام'],
            ['name' => 'Gramme',      'symbol' => 'G',   'description' => 'غرام'],
            ['name' => 'Tonne',       'symbol' => 'T',   'description' => 'طن'],
            ['name' => 'Litre',       'symbol' => 'L',   'description' => 'لتر'],
            ['name' => 'Mètre',       'symbol' => 'M',   'description' => 'متر'],
            ['name' => 'Mètre carré', 'symbol' => 'M²',  'description' => 'متر مربع'],
            ['name' => 'Mètre cube',  'symbol' => 'M³',  'description' => 'متر مكعب'],
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->first()?->id;

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
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        ];

        $order = 1;
        foreach ($units as $unit) {
<<<<<<< HEAD
            DB::table('units')->upsert([
                'company_id'    => $companyId,
                'name'          => $unit['name'],
                'symbol'        => $unit['symbol'],
                'description'   => $unit['description'],
                'active'        => true,
                'display_order' => $order++,
                'created_at'    => now(),
                'updated_at'    => now(),
            ], ['company_id', 'name']);
=======
            DB::table('units')->insert([
                'company_id' => $companyId,
                'name' => $unit['name'],
                'symbol' => $unit['symbol'],
                'description' => $unit['description'],
                'active' => true,
                'display_order' => $order++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        }
    }
}




// ===== ملف: UserSeeder.php =====
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
<<<<<<< HEAD
use Illuminate\Support\Facades\DB;
=======
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

class UserSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        // جلب أول شركة موجودة
        $companyId = DB::table('companies')->value('id');

        if (!$companyId) {
            $this->command->error('لا توجد شركة لإسنادها للمستخدمين. قم بتشغيل CompanySeeder أولاً.');
            return;
        }

        // إنشاء Super Admin - (الدور موجود وصحيح)
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
            'company_id' => $companyId,
        ]);
        $superAdmin->assignRole('super-admin');

        // إنشاء Admin User
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin.user@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
            'company_id' => $companyId,
        ]);

        // التعديل هنا: استبدال 'moderator' بـ 'admin' أو 'manager'
        $admin->assignRole('admin');
=======
        // Super Admin — لا يحتاج company_id (الجدول لا يحتوي هذا العمود)
        User::create([
            'name'              => 'Super Admin',
            'email'             => 'admin@mail.com',
            'password'          => Hash::make('password'),
            'active'            => true,
            'email_verified_at' => now(),
        ]);

        // Admin User
        User::create([
            'name'              => 'Admin User',
            'email'             => 'admin.user@mail.com',
            'password'          => Hash::make('password'),
            'active'            => true,
            'email_verified_at' => now(),
        ]);

        // ملاحظة: الأدوار تُسند بعد تشغيل RolesAndPermissionsSeeder عبر CompanySeeder
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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
<<<<<<< HEAD
        $companyId = DB::table('companies')->first()->id;
        $wilayaId  = DB::table('wilayas')->where('code', 39)->value('id'); // الوادي
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');
        $wilayaId  = DB::table('wilayas')->where('code', 39)->value('id');
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

        DB::table('warehouses')->insert([
            'company_id'   => $companyId,
            'name'         => 'Dépôt Principal',
            'code'         => 'DP01',
<<<<<<< HEAD
            'address'      => 'Cité 08 Mai, Eloued',
=======
            'address'      => 'Zgoum, Eloued',
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
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


