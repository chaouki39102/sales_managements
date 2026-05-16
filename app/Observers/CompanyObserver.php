<?php

namespace App\Observers;

use App\Models\Company;
use App\Services\CompanyRoleService;
use Database\Seeders\CompanySeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CompanyObserver
 * ══════════════════════════════════════════════════════════════════
 * يستمع لحدث created() على نموذج Company ويشغّل CompanySeeder
 * تلقائياً لبذر جميع بيانات الشركة الجديدة.
 *
 * التسجيل في AppServiceProvider::boot():
 *   Company::observe(CompanyObserver::class);
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyObserver
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    public function created(Company $company): void
    {
        // تعيين company_id للسيدرات
        config(['seeding.company_id' => $company->id]);

        try {
            DB::transaction(function () use ($company) {
                app(CompanySeeder::class)->run();
            });

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("CompanyObserver: بذر بيانات الشركة #{$company->id} ({$company->slug}) اكتمل بنجاح");
        } catch (\Throwable $e) {
            // لا نوقف إنشاء الشركة — نسجّل الخطأ فقط
            Log::error("CompanyObserver: فشل بذر بيانات الشركة #{$company->id}: " . $e->getMessage(), [
                'company_id' => $company->id,
                'trace'      => $e->getTraceAsString(),
            ]);
        }
    }
}
