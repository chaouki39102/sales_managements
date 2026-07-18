<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\DocumentBaseOperationSeeder;
use Database\Seeders\DocumentStatusSeeder;
use Database\Seeders\DocumentTypeConversionSeeder;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\ExpenseCategorySeeder;
use Database\Seeders\FiscalStampSeeder;
use Database\Seeders\InventoryValuationMethodSeeder;
use Database\Seeders\LegalFormSeeder;
use Database\Seeders\NumberingSeriesSeeder;
use Database\Seeders\PartyTypeSeeder;
use Database\Seeders\PaymentModeSeeder;
use Database\Seeders\PriceLevelSeeder;
use Database\Seeders\ProductTypeSeeder;
use Database\Seeders\StockMovementTypeSeeder;
use Database\Seeders\TreasuryAccountSeeder;
use Database\Seeders\TreasuryAccountTypeSeeder;
use Database\Seeders\TvaSeeder;
use Database\Seeders\UnitSeeder;
use Database\Seeders\WarehouseSeeder;
use Database\Seeders\WilayaCommuneSeeder;

class CompanySeedController extends Controller
{
    private const SEEDERS = [
        'currencies'                  => [CurrencySeeder::class,                  'currencies'],
        'tvas'                        => [TvaSeeder::class,                        'tvas'],
        'units'                       => [UnitSeeder::class,                       'units'],
        'legal-forms'                 => [LegalFormSeeder::class,                  'legal_forms'],
        'fiscal-stamps'               => [FiscalStampSeeder::class,                'fiscal_stamps'],
        'price-levels'                => [PriceLevelSeeder::class,                 'price_levels'],
        'party-types'                 => [PartyTypeSeeder::class,                  'party_types'],
        'product-types'               => [ProductTypeSeeder::class,                'product_types'],
        'stock-movement-types'        => [StockMovementTypeSeeder::class,          'stock_movement_types'],
        'treasury-account-types'      => [TreasuryAccountTypeSeeder::class,        'treasury_account_types'],
        'document-base-operations'    => [DocumentBaseOperationSeeder::class,      'document_base_operations'],
        'document-statuses'           => [DocumentStatusSeeder::class,             'document_statuses'],
        'document-types'              => [DocumentTypeSeeder::class,               'document_types'],
        'document-type-conversions'   => [DocumentTypeConversionSeeder::class,     'document_type_conversions'],
        'inventory-valuation-methods' => [InventoryValuationMethodSeeder::class,   'inventory_valuation_methods'],
        'warehouses'                  => [WarehouseSeeder::class,                  'warehouses'],
        'treasury-accounts'           => [TreasuryAccountSeeder::class,            'treasury_accounts'],
        'payment-modes'               => [PaymentModeSeeder::class,                'payment_modes'],
        'expense-categories'          => [ExpenseCategorySeeder::class,            'expense_categories'],
        'numbering-series'            => [NumberingSeriesSeeder::class,            'numbering_series'],
        // ✅ إضافة wilayas-communes (كان مفقوداً)
        'wilayas-communes'            => [WilayaCommuneSeeder::class,              'wilayas'],
    ];

    public function run(Company $company, string $seeder): JsonResponse
    {
        // ✅ الإصلاح: استبدال authorize('manage') بتحقق مباشر من الـ permission
        // authorize('manage', $company) كانت تبحث عن CompanyPolicy@manage غير موجودة → 403
        $user = request()->user();

        // السوبر أدمن يمر دائماً
        if (!$user->hasRole('super-admin')) {
            // تحقق أن المستخدم مالك الشركة أو عضو نشط
            $membership = DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->where('active', true)
                ->first();

            if (!$membership) {
                return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
            }

            // تحقق من permission manage_lookups أو update_company
            if (!$user->can('manage_lookups') && !$user->can('update_company')) {
                return response()->json(['message' => 'ليس لديك صلاحية بذر البيانات.'], 403);
            }
        }

        if (!isset(self::SEEDERS[$seeder])) {
            return response()->json(['message' => 'seeder غير معروف: ' . $seeder], 404);
        }

        [$class, $table] = self::SEEDERS[$seeder];

        // التحقق من وجود بيانات مسبقة — تجاهل إذا كان الجدول عالمياً (wilayas, legal_forms...)
        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        if (!in_array($table, $globalTables)) {
            if (DB::table($table)->where('company_id', $company->id)->exists()) {
                return response()->json(['message' => 'البيانات موجودة مسبقاً للشركة']);
            }
        } else {
            // للجداول العالمية: تحقق بدون company_id
            if (DB::table($table)->exists()) {
                return response()->json(['message' => 'البيانات العالمية موجودة مسبقاً']);
            }
        }

        config(['seeding.company_id' => $company->id]);

        return $this->execute($class);
    }

public function seedAll(Company $company): JsonResponse
{
    $user = request()->user();

    if (!$user->hasRole('super-admin')) {
        $membership = DB::table('company_user')
            ->where('user_id', $user->id)
            ->where('company_id', $company->id)
            ->where('active', true)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
        }
    }

    $ordered = array_keys(self::SEEDERS);
    $applied = [];
    $skipped = [];
    $errors  = [];

    foreach ($ordered as $key) {
        [$class, $table] = self::SEEDERS[$key];

        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        $exists = in_array($table, $globalTables)
            ? DB::table($table)->exists()
            : DB::table($table)->where('company_id', $company->id)->exists();

        if ($exists) {
            $skipped[] = $key;
            continue;
        }

        try {
            config(['seeding.company_id' => $company->id]);
            (new $class)->run();
            $applied[] = $key;
        } catch (\Throwable $e) {
            logger()->error("SeedAll فشل ($key) للشركة {$company->id}: " . $e->getMessage());
            $errors[$key] = $e->getMessage();
        }
    }

    // ✅ تعيين دور admin للمالك بعد اكتمال السيد
    $owner = \App\Models\User::find($company->owner_id);
    if ($owner) {
        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $company->id)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    return response()->json([
        'message' => empty($errors)
            ? 'تم تطبيق جميع البيانات الأساسية بنجاح'
            : 'تم تطبيق '.count($applied).' من '.count($ordered).' — '.count($errors).' فشل',
        'applied' => $applied,
        'skipped' => $skipped,
        'errors'  => $errors,
    ]);
}

    private function execute(string $class): JsonResponse
    {
        try {
            DB::transaction(fn () => (new $class)->run());
            return response()->json(['message' => 'تم التطبيق بنجاح']);
        } catch (\Throwable $e) {
            logger()->error('CompanySeedController فشل: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
