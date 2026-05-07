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
use Database\Seeders\PaymentModeSeeder;
use Database\Seeders\PriceLevelSeeder;
use Database\Seeders\TreasuryAccountSeeder;
use Database\Seeders\TvaSeeder;
use Database\Seeders\UnitSeeder;
use Database\Seeders\WarehouseSeeder;
use Database\Seeders\WilayaCommuneSeeder;

class CompanySeedController extends Controller
{
    /**
     * خريطة: seeder_key → class name
     */
    private const SEEDERS = [
        'currencies'                  => CurrencySeeder::class,
        'tvas'                        => TvaSeeder::class,
        'units'                       => UnitSeeder::class,
        'legal-forms'                 => LegalFormSeeder::class,
        'fiscal-stamps'               => FiscalStampSeeder::class,
        'price-levels'                => PriceLevelSeeder::class,
        'wilayas-communes'            => WilayaCommuneSeeder::class,
        'document-base-operations'    => DocumentBaseOperationSeeder::class,
        'document-statuses'           => DocumentStatusSeeder::class,
        'document-types'              => DocumentTypeSeeder::class,
        'inventory-valuation-methods' => InventoryValuationMethodSeeder::class,
        'numbering-series'            => NumberingSeriesSeeder::class,
        'warehouses'                  => WarehouseSeeder::class,
        'treasury-accounts'           => TreasuryAccountSeeder::class,
        'payment-modes'               => PaymentModeSeeder::class,
        'expense-categories'          => ExpenseCategorySeeder::class,
    ];

    /**
     * الجداول العالمية (البيانات المشتركة) – لا نحاول إعادة إدراجها إن احتوت بيانات.
     */
    private const GLOBAL_TABLES = [
        'currencies'                  => 'currencies',
        'tvas'                        => 'tvas',
        'legal-forms'                 => 'legal_forms',
        'fiscal-stamps'               => 'fiscal_stamps',
        'document-base-operations'    => 'document_base_operations',
        'document-statuses'           => 'document_statuses',
        'document-types'              => 'document_types',
        'inventory-valuation-methods' => 'inventory_valuation_methods',
        'wilayas-communes'            => 'wilayas',      // وجود ولاية واحدة يكفي
    ];

    /**
     * تشغيل سيدر محدد داخل نطاق شركة.
     */
    public function run(Company $company, string $seeder): JsonResponse
    {
        // تحقق أن المستخدم عضو في الشركة
        if (!$company->users()->where('user_id', auth()->id())->exists()) {
            return response()->json(['message' => 'غير مصرح به'], 403);
        }

        if (!isset(self::SEEDERS[$seeder])) {
            return response()->json(['message' => 'seeder غير معروف'], 404);
        }

        // ── البيانات العالمية: إذا كانت موجودة مسبقاً نكتفي بالنجاح ──
        if (isset(self::GLOBAL_TABLES[$seeder])) {
            $table = self::GLOBAL_TABLES[$seeder];
            if (DB::table($table)->exists()) {
                return response()->json(['message' => 'البيانات العالمية موجودة مسبقاً']);
            }
        }

        try {
            // تمرير company_id عبر config (تستخدمه seeders الـ Tenant)
            config(['seeding.company_id' => $company->id]);

            $seederClass = self::SEEDERS[$seeder];

            DB::transaction(function () use ($seederClass) {
                (new $seederClass)->run();
            });

            return response()->json(['message' => 'تم التطبيق بنجاح']);
        } catch (\Exception $e) {
            logger()->error('CompanySeedController failed', [
                'company_id' => $company->id,
                'seeder'     => $seeder,
                'exception'  => $e->getMessage(),
            ]);

            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
