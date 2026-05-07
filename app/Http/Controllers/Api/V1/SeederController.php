<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * SeederController
 *
 * يتيح تشغيل الـ Seeders الفردية عبر API — للإعداد الأولي للشركة.
 * مقتصر على Super Admin أو صاحب الشركة فقط.
 */
class SeederController extends BaseApiController
{
    protected string $resourceName = 'seeder';

    protected function getService() { return null; }
    protected function getModelClass(): string { return \App\Models\Company::class; }

    /**
     * الـ Seeders المسموح بتشغيلها عبر API
     * (whitelist صريح — لا نسمح بتشغيل أي seeder عشوائي)
     */
    private const ALLOWED = [
        'RolesAndPermissionsSeeder',
        'GenderSeeder',
        'LegalFormSeeder',
        'WilayaCommuneSeeder',
        'CurrencySeeder',
        'TvaSeeder',
        'FiscalStampSeeder',
        'PriceLevelSeeder',
        'PaymentModeSeeder',
        'TreasuryAccountSeeder',
        'ExpenseCategorySeeder',
        'UnitSeeder',
        'InventoryValuationMethodSeeder',
        'WarehouseSeeder',
        'DocumentBaseOperationSeeder',
        'DocumentStatusSeeder',
        'DocumentTypeSeeder',
        'NumberingSeriesSeeder',
        'PartierSeeder',
        'FiscalYearSeeder',
    ];

    public function run(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحية — super-admin أو admin الشركة فقط
            $user = auth()->user();
            if (
                !$user->hasRole('super-admin') &&
                !$user->hasRole('admin')
            ) {
                return $this->errorResponse('ليس لديك صلاحية تشغيل الـ Seeders', 403);
            }

            // 2. التحقق من اسم الـ Seeder
            $seederName = $request->input('seeder');
            if (!$seederName || !in_array($seederName, self::ALLOWED)) {
                return $this->errorResponse(
                    "الـ Seeder '{$seederName}' غير مسموح به أو غير موجود",
                    422
                );
            }

            $class = "Database\\Seeders\\{$seederName}";
            if (!class_exists($class)) {
                return $this->errorResponse("الـ Seeder '{$seederName}' غير موجود في النظام", 404);
            }

            // 3. تشغيل الـ Seeder
            Log::info("Running seeder via API", [
                'seeder'     => $seederName,
                'user_id'    => $user->id,
                'company_id' => app(\App\Services\CompanyContextService::class)->get(),
            ]);

            Artisan::call('db:seed', [
                '--class' => $class,
                '--force' => true,
            ]);

            $output = Artisan::output();

            return $this->successResponse(
                ['seeder' => $seederName, 'output' => trim($output)],
                "تم تشغيل {$seederName} بنجاح"
            );

        } catch (\Throwable $e) {
            Log::error("Seeder API failed", [
                'seeder' => $request->input('seeder'),
                'error'  => $e->getMessage(),
            ]);

            return $this->errorResponse(
                config('app.debug') ? $e->getMessage() : 'فشل تشغيل الـ Seeder',
                500
            );
        }
    }

    /**
     * قائمة الـ Seeders المتاحة
     */
    public function available(): JsonResponse
    {
        return $this->successResponse(
            array_values(self::ALLOWED),
            'قائمة الـ Seeders المتاحة'
        );
    }
}
