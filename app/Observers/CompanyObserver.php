<?php

namespace App\Observers;

use App\Models\Company;
use App\Models\User;
use App\Services\CompanyRoleService;
use Illuminate\Support\Facades\Log;

/**
 * CompanyObserver
 * ══════════════════════════════════════════════════════════════════
 * يُطلق تلقائياً عند إنشاء شركة جديدة ويقوم بـ:
 *  1. إنشاء أدوار الشركة الستة وتعيين صلاحياتها
 *  2. تعيين دور admin للمالك (owner) تلقائياً
 *
 * التسجيل:
 *  في AppServiceProvider::boot() أضف:
 *      Company::observe(CompanyObserver::class);
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyObserver
{
    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    /**
     * يُطلق بعد إنشاء الشركة مباشرةً.
     */
    public function created(Company $company): void
    {
        try {
            // 1. إنشاء الأدوار وتعيين الصلاحيات
            $this->roleService->seedRoles($company->id);

            // 2. تعيين دور admin للمالك تلقائياً
            if ($company->owner_id) {
                $owner = User::find($company->owner_id);
                if ($owner) {
                    $this->roleService->assignRole($owner, 'admin', $company->id);
                    Log::info("✅ [CompanyObserver] تم تعيين دور admin للمالك #{$owner->id} في الشركة #{$company->id}");
                }
            }

        } catch (\Throwable $e) {
            // لا نوقف إنشاء الشركة بسبب خطأ في الأدوار — نسجّل فقط
            Log::error("[CompanyObserver] فشل بذر الأدوار للشركة #{$company->id}: " . $e->getMessage(), [
                'exception' => $e,
                'company_id' => $company->id,
            ]);
        }
    }

    /**
     * اختياري: تنظيف أدوار الشركة عند حذفها نهائياً.
     */
    public function forceDeleted(Company $company): void
    {
        try {
            \Spatie\Permission\Models\Role::where('company_id', $company->id)->each(function ($role) {
                $role->syncPermissions([]);
                $role->delete();
            });

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("🗑️ [CompanyObserver] تم حذف أدوار الشركة #{$company->id}");

        } catch (\Throwable $e) {
            Log::error("[CompanyObserver] فشل حذف أدوار الشركة #{$company->id}: " . $e->getMessage());
        }
    }
}
