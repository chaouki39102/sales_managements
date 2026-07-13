<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Services\CompanyRoleService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * CompanySeeder — بيانات الشركة الكاملة
 * ══════════════════════════════════════════════════════════════════
 * يُشغَّل عند إنشاء كل شركة جديدة — سواء عبر:
 *   - php artisan db:seed (أول تشغيل — يُنشئ شركة تجريبية)
 *   - POST /api/v1/admin/companies/{company}/seed/all  (من لوحة الأدمن)
 *   - CompanyObserver::created()  (تلقائياً عند إنشاء شركة)
 *
 * يقرأ company_id من config('seeding.company_id')
 * ══════════════════════════════════════════════════════════════════
 *
 * الجداول التي يملؤها (كلها تحمل company_id):
 *   currencies · tvas · units · legal_forms · fiscal_stamps
 *   price_levels · party_types · product_types · genders
 *   stock_movement_types · treasury_account_types
 *   document_base_operations · document_statuses
 *   inventory_valuation_methods · document_types
 *   warehouses · treasury_accounts · payment_modes
 *   expense_categories · numbering_series · fiscal_years
 *   roles (admin/manager/cashier/viewer — company_id = شركة)
 */
class CompanySeeder extends Seeder
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function run(): void
    {
        $companyId = config('seeding.company_id')
            ?? DB::table('companies')->value('id');

        if (!$companyId) {
            throw new \RuntimeException('CompanySeeder: لا يوجد company_id — تأكد من تعيين config("seeding.company_id")');
        }

        $this->command?->info("🏢 بدء بذر بيانات الشركة #{$companyId}...");

        // ─── المرحلة 1: بيانات المرجع الأساسية ───────────────────
        $this->call([
            GenderSeeder::class,
            CurrencySeeder::class,
            TvaSeeder::class,
            UnitSeeder::class,
            LegalFormSeeder::class,
            FiscalStampSeeder::class,
            InventoryValuationMethodSeeder::class,
            PriceLevelSeeder::class,
            PartyTypeSeeder::class,
            ProductTypeSeeder::class,
            StockMovementTypeSeeder::class,
            TreasuryAccountTypeSeeder::class,
        ]);

        // ─── المرحلة 1ب: زبون الصندوق الافتراضي ─────────────────
        $this->seedCashClient($companyId);

        // ─── المرحلة 2: عمليات المستندات وحالاتها ────────────────
        $this->call([
            DocumentBaseOperationSeeder::class,
            DocumentStatusSeeder::class,
        ]);

        // ─── المرحلة 3: المستودع والخزينة وطرق الدفع ─────────────
        // (الترتيب مهم: Treasury قبل PaymentMode لأن payment_modes.treasury_account_id)
        $this->call([
            WarehouseSeeder::class,
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ─── المرحلة 4: أنواع المستندات وسلاسل الترقيم ──────────
        // (تعتمد على document_base_operations و warehouses)
        $this->call([
            DocumentTypeSeeder::class,
            NumberingSeriesSeeder::class,
        ]);

        // ─── المرحلة 4ب: خريطة التحويل بين أنواع المستندات ─────
        // (تعتمد على معرفات document_types الموجودة مسبقاً)
        $this->call([
            DocumentTypeConversionSeeder::class,
        ]);

        // ─── المرحلة 5: تصنيفات المصاريف ─────────────────────────
        $this->call([
            ExpenseCategorySeeder::class,
        ]);

        // ─── المرحلة 6: السنة المالية الأولى ─────────────────────
        $this->seedFiscalYear($companyId);

        // ─── المرحلة 7: الإعدادات العامة للشركة (جديد) ───────────
        // 🔥 استدعاء SettingsSeeder لإنشاء الإعدادات الافتراضية
        $this->command?->info("⚙️  جاري إنشاء إعدادات الشركة...");
        $settingsSeeder = new SettingsSeeder();
        $settingsSeeder->seedForCompany($companyId);
        $this->command?->info("✅ تم إنشاء إعدادات الشركة #{$companyId}");

        // ─── المرحلة 8: الأدوار الخاصة بالشركة ──────────────────
        // (admin, manager, cashier, viewer — company_id = $companyId)
        $this->roleService->seedRoles($companyId);
        $this->command?->info("✅ تم إنشاء أدوار الشركة #{$companyId}");

        // ─── المرحلة 9: تعيين دور admin للمالك ──────────────────
        $this->assignOwnerRole($companyId);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command?->info("🎉 اكتمل بذر بيانات الشركة #{$companyId} بنجاح!");
    }

    // ─────────────────────────────────────────────────────────────

    private function seedCashClient(int $companyId): void
    {
        // تجنب التكرار
        if (DB::table('parties')->where('company_id', $companyId)->where('slug', 'client-cash')->exists()) {
            return;
        }

        $clientTypeId = DB::table('party_types')
            ->where('company_id', $companyId)
            ->where('name', 'client')
            ->value('id');

        if (!$clientTypeId) {
            return;
        }

        DB::table('parties')->insert([
            'company_id'           => $companyId,
            'party_type_id'        => $clientTypeId,
            'code'                 => 'CC000',
            'name'                 => 'Client Cash',
            'commercial_name'      => null,
            'slug'                 => 'client-cash',
            'nif'                  => null,
            'rc'                   => null,
            'nis'                  => null,
            'ai'                   => null,
            'address'              => null,
            'phone'                => null,
            'mobile'               => null,
            'email'                => null,
            'initial_balance'      => 0.00,
            'credit_limit'         => 0.00,
            'is_tva_exempt'        => true,
            'is_taxable'           => false,
            'is_final_consumer'    => true,
            'is_vat_registered'    => false,
            'active'               => true,
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $this->command?->line("  ↳ Client Cash party created");
    }

    private function seedFiscalYear(int $companyId): void
    {
        // تجنب التكرار
        if (DB::table('fiscal_years')->where('company_id', $companyId)->exists()) {
            return;
        }

        $year = Carbon::now()->year;

        DB::table('fiscal_years')->insert([
            'company_id' => $companyId,
            'name'       => "Exercice {$year}",
            'start_date' => "{$year}-01-01",
            'end_date'   => "{$year}-12-31",
            'is_closed'  => false,
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function assignOwnerRole(int $companyId): void
    {
        $company = DB::table('companies')->find($companyId);

        if (!$company?->owner_id) {
            return;
        }

        $owner = \App\Models\User::find($company->owner_id);

        if (!$owner) {
            return;
        }

        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $companyId)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
            $this->command?->line("  ↳ admin role ← {$owner->email}");
        }
    }
}
