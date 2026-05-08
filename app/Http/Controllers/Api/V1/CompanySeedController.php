<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\DocumentBaseOperationSeeder;
use Database\Seeders\DocumentStatusSeeder;
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

/**
 * CompanySeedController
 *
 * يتحكم في بذر البيانات الأولية الخاصة بشركة محددة (Tenant).
 * جميع الجداول المعزولة تتطلب company_id، لذلك نمرره عبر config لاستخدامه داخل السيدرز.
 *
 * الطرق:
 *   run(Company, seeder)  – تشغيل سيدر واحد
 *   seedAll(Company)      – تشغيل جميع السيدرز بالترتيب الصحيح
 */
class CompanySeedController extends Controller
{
    /**
     * خريطة المفاتيح الواردة من الواجهة إلى [SeederClass, tableName].
     * نستخدم اسم الجدول للتحقق من وجود بيانات مسبقة للشركة الحالية.
     */
    private const SEEDERS = [
        'currencies'                  => [CurrencySeeder::class,                  'currencies'],
        'tvas'                        => [TvaSeeder::class,                        'tvas'],
        'units'                       => [UnitSeeder::class,                       'units'],
        'legal-forms'                 => [LegalFormSeeder::class,                 'legal_forms'],
        'fiscal-stamps'               => [FiscalStampSeeder::class,               'fiscal_stamps'],
        'price-levels'                => [PriceLevelSeeder::class,                'price_levels'],
        'party-types'                 => [PartyTypeSeeder::class,                 'party_types'],
        'product-types'               => [ProductTypeSeeder::class,               'product_types'],
        'stock-movement-types'        => [StockMovementTypeSeeder::class,         'stock_movement_types'],
        'treasury-account-types'      => [TreasuryAccountTypeSeeder::class,       'treasury_account_types'],
        'document-base-operations'    => [DocumentBaseOperationSeeder::class,     'document_base_operations'],
        'document-statuses'           => [DocumentStatusSeeder::class,            'document_statuses'],
        'document-types'              => [DocumentTypeSeeder::class,              'document_types'],
        'inventory-valuation-methods' => [InventoryValuationMethodSeeder::class,  'inventory_valuation_methods'],
        'warehouses'                  => [WarehouseSeeder::class,                  'warehouses'],
        'treasury-accounts'           => [TreasuryAccountSeeder::class,            'treasury_accounts'],
        'payment-modes'               => [PaymentModeSeeder::class,                'payment_modes'],
        'expense-categories'          => [ExpenseCategorySeeder::class,            'expense_categories'],
        'numbering-series'            => [NumberingSeriesSeeder::class,            'numbering_series'],
    ];

    /**
     * تشغيل سيدر محدد داخل نطاق شركة.
     *
     * @param Company $company
     * @param string  $seeder   المفتاح (كما في SEEDERS)
     */
    public function run(Company $company, string $seeder): JsonResponse
    {
        $this->authorize('manage', $company);

        if (! isset(self::SEEDERS[$seeder])) {
            return response()->json(['message' => 'seeder غير معروف'], 404);
        }

        [$class, $table] = self::SEEDERS[$seeder];

        // ── التحقق من أن البيانات غير موجودة مسبقاً لهذه الشركة ──
        if (DB::table($table)->where('company_id', $company->id)->exists()) {
            return response()->json(['message' => 'البيانات موجودة مسبقاً للشركة']);
        }

        // تمرير company_id عبر config (تستخدمه جميع سيدرز الشركة)
        config(['seeding.company_id' => $company->id]);

        return $this->execute($class);
    }

    /**
     * تشغيل جميع السيدرز لشركة جديدة بالترتيب الصحيح الذي يحترم تبعيات المفاتيح الخارجية.
     *
     * @param Company $company
     */
    public function seedAll(Company $company): JsonResponse
    {
        $this->authorize('manage', $company);

        // الترتيب مهم جداً (نوع الحساب قبل الحسابات، أنواع المستندات قبل السلاسل ...إلخ)
        $ordered = [
            'currencies',
            'tvas',
            'units',
            'legal-forms',
            'fiscal-stamps',
            'price-levels',
            'party-types',
            'product-types',
            'stock-movement-types',
            'treasury-account-types',
            'document-base-operations',
            'document-statuses',
            'document-types',
            'inventory-valuation-methods',
            'warehouses',
            'treasury-accounts',
            'payment-modes',
            'expense-categories',
            'numbering-series',
        ];

        $applied = [];
        $skipped = [];

        foreach ($ordered as $key) {
            [$class, $table] = self::SEEDERS[$key];

            if (DB::table($table)->where('company_id', $company->id)->exists()) {
                $skipped[] = $key;
                continue;
            }

            try {
                config(['seeding.company_id' => $company->id]);
                (new $class)->run();
                $applied[] = $key;
            } catch (\Throwable $e) {
                logger()->error("SeedAll فشل ($key) للشركة {$company->id}: " . $e->getMessage());
                return response()->json([
                    'message' => "فشل تطبيق {$key}: " . $e->getMessage(),
                    'applied' => $applied,
                    'skipped' => $skipped,
                ], 500);
            }
        }

        return response()->json([
            'message' => 'تم تطبيق جميع البيانات الأساسية بنجاح',
            'applied' => $applied,
            'skipped' => $skipped,
        ]);
    }

    /**
     * تنفيذ سيدر واحد مع تغليف المعاملة.
     */
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
