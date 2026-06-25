<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\CompanyRoleService;
use Database\Seeders\GlobalRolesAndPermissionsSeeder;
use Database\Seeders\WilayaCommuneSeeder;
use Database\Seeders\CompanySeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AdminSeedController
 * ══════════════════════════════════════════════════════════════════
 * Routes (كلها تحت middleware auth:sanctum + super.admin):
 *
 *   POST /api/v1/admin/seed/global
 *       ← تشغيل GlobalSeeder (ولايات + صلاحيات + super-admin)
 *       ← آمن للتكرار (firstOrCreate / upsert / truncate+reinsert)
 *
 *   POST /api/v1/admin/seed/wilayas
 *       ← إعادة بذر الولايات والبلديات فقط
 *
 *   POST /api/v1/admin/seed/permissions
 *       ← إعادة مزامنة الصلاحيات ودور super-admin فقط
 *
 *   POST /api/v1/admin/companies/{company}/seed
 *       ← بذر بيانات شركة محددة كاملاً (idempotent)
 *
 *   POST /api/v1/admin/companies/{company}/seed/{seeder}
 *       ← بذر جدول واحد لشركة محددة
 * ══════════════════════════════════════════════════════════════════
 */
class AdminSeedController extends Controller
{
    // خريطة السيدرات المتاحة لكل شركة
    private const COMPANY_SEEDERS = [
        'currencies'                  => [\Database\Seeders\CurrencySeeder::class,                 'currencies'],
        'tvas'                        => [\Database\Seeders\TvaSeeder::class,                      'tvas'],
        'units'                       => [\Database\Seeders\UnitSeeder::class,                     'units'],
        'legal-forms'                 => [\Database\Seeders\LegalFormSeeder::class,                'legal_forms'],
        'fiscal-stamps'               => [\Database\Seeders\FiscalStampSeeder::class,              'fiscal_stamps'],
        'price-levels'                => [\Database\Seeders\PriceLevelSeeder::class,               'price_levels'],
        'party-types'                 => [\Database\Seeders\PartyTypeSeeder::class,                'party_types'],
        'product-types'               => [\Database\Seeders\ProductTypeSeeder::class,              'product_types'],
        'genders'                     => [\Database\Seeders\GenderSeeder::class,                   'genders'],
        'stock-movement-types'        => [\Database\Seeders\StockMovementTypeSeeder::class,        'stock_movement_types'],
        'treasury-account-types'      => [\Database\Seeders\TreasuryAccountTypeSeeder::class,      'treasury_account_types'],
        'document-base-operations'    => [\Database\Seeders\DocumentBaseOperationSeeder::class,    'document_base_operations'],
        'document-statuses'           => [\Database\Seeders\DocumentStatusSeeder::class,           'document_statuses'],
        'inventory-valuation-methods' => [\Database\Seeders\InventoryValuationMethodSeeder::class, 'inventory_valuation_methods'],
        'document-types'              => [\Database\Seeders\DocumentTypeSeeder::class,             'document_types'],
        'document-type-conversions'   => [\Database\Seeders\DocumentTypeConversionSeeder::class,    'document_type_conversions'],
        'warehouses'                  => [\Database\Seeders\WarehouseSeeder::class,                'warehouses'],
        'treasury-accounts'           => [\Database\Seeders\TreasuryAccountSeeder::class,          'treasury_accounts'],
        'payment-modes'               => [\Database\Seeders\PaymentModeSeeder::class,              'payment_modes'],
        'expense-categories'          => [\Database\Seeders\ExpenseCategorySeeder::class,          'expense_categories'],
        'numbering-series'            => [\Database\Seeders\NumberingSeriesSeeder::class,          'numbering_series'],
    ];

    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/global
    // ─────────────────────────────────────────────────────────────

    public function seedGlobal(): JsonResponse
    {
        try {
            DB::transaction(function () {
                // 1. ولايات + بلديات
                (new WilayaCommuneSeeder())->run();

                // 2. صلاحيات + دور super-admin
                app(GlobalRolesAndPermissionsSeeder::class)->run();
            });

            return response()->json([
                'message'      => 'تم تطبيق البيانات العالمية بنجاح',
                'wilayas'      => DB::table('wilayas')->count(),
                'communes'     => DB::table('communes')->count(),
                'permissions'  => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('GlobalSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/wilayas
    // ─────────────────────────────────────────────────────────────

    public function seedWilayas(): JsonResponse
    {
        try {
            (new WilayaCommuneSeeder())->run();

            return response()->json([
                'message'  => 'تم تحديث الولايات والبلديات',
                'wilayas'  => DB::table('wilayas')->count(),
                'communes' => DB::table('communes')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('WilayaSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/permissions
    // ─────────────────────────────────────────────────────────────

    public function seedPermissions(): JsonResponse
    {
        try {
            app(GlobalRolesAndPermissionsSeeder::class)->run();

            return response()->json([
                'message'     => 'تم تحديث الصلاحيات ودور super-admin',
                'permissions' => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('PermissionSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/companies/{company}/seed
    // ─────────────────────────────────────────────────────────────

    public function seedCompany(Company $company): JsonResponse
    {
        config(['seeding.company_id' => $company->id]);

        $applied = [];
        $skipped = [];

        try {
            DB::transaction(function () use ($company, &$applied, &$skipped) {
                foreach (self::COMPANY_SEEDERS as $key => [$class, $table]) {
                    if (DB::table($table)->where('company_id', $company->id)->exists()) {
                        $skipped[] = $key;
                        continue;
                    }

                    (new $class)->run();
                    $applied[] = $key;
                }

                // السنة المالية
                if (!DB::table('fiscal_years')->where('company_id', $company->id)->exists()) {
                    $this->seedFiscalYear($company->id);
                    $applied[] = 'fiscal-year';
                } else {
                    $skipped[] = 'fiscal-year';
                }

                // أدوار الشركة
                if (!DB::table('roles')->where('company_id', $company->id)->exists()) {
                    $this->roleService->seedRoles($company->id);
                    $applied[] = 'roles';
                } else {
                    $skipped[] = 'roles';
                }

                // تعيين admin للمالك
                $this->assignOwnerRole($company);
            });

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            return response()->json([
                'message' => 'تم تطبيق جميع بيانات الشركة بنجاح',
                'applied' => $applied,
                'skipped' => $skipped,
            ]);
        } catch (\Throwable $e) {
            Log::error("CompanySeed failed for #{$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => 'فشل: ' . $e->getMessage(),
                'applied' => $applied,
                'skipped' => $skipped,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/companies/{company}/seed/{seeder}
    // ─────────────────────────────────────────────────────────────

    public function seedCompanySingle(Company $company, string $seeder): JsonResponse
    {
        if (!isset(self::COMPANY_SEEDERS[$seeder])) {
            return response()->json([
                'message'   => "seeder غير معروف: {$seeder}",
                'available' => array_keys(self::COMPANY_SEEDERS),
            ], 404);
        }

        [$class, $table] = self::COMPANY_SEEDERS[$seeder];

        if (DB::table($table)->where('company_id', $company->id)->exists()) {
            return response()->json([
                'message' => 'البيانات موجودة مسبقاً للشركة',
                'skipped' => true,
            ]);
        }

        config(['seeding.company_id' => $company->id]);

        try {
            DB::transaction(fn () => (new $class)->run());

            return response()->json(['message' => "تم تطبيق {$seeder} بنجاح"]);
        } catch (\Throwable $e) {
            Log::error("Seed [{$seeder}] failed for #{$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => 'فشل: ' . $e->getMessage(),
                'seeder'  => $seeder,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function seedFiscalYear(int $companyId): void
    {
        $year = now()->year;
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

    private function assignOwnerRole(Company $company): void
    {
        if (!$company->owner_id) return;

        $owner = \App\Models\User::find($company->owner_id);
        if (!$owner) return;

        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $company->id)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
        }
    }
}
