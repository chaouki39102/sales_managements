<?php

namespace App\Providers;

use App\Models\Company;
use App\Policies\CompanyPolicy;
use App\Services\CompanyContextService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CompanyContextService::class);
    }

public function boot(): void
{
    // ✅ تحليل {company} بالـ slug وليس بالـ id
    Route::bind('company', function (string $value) {
        return Company::where('slug', $value)->firstOrFail();
    });

    // ✅ Super Admin (Spatie role) يتجاوز كل الصلاحيات
    Gate::before(function ($user, $ability) {
        if (method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
            return true;
        }

        // ✅ مالك الشركة الحالية يمتلك صلاحيات مطلقة داخل شركته
        try {
            $companyId = app(CompanyContextService::class)->get();
            if ($companyId) {
                $company = Company::find($companyId);
                if ($company && $company->owner_id === $user->id) {
                    return true; // السماح بكل شيء
                }
            }
        } catch (\RuntimeException $e) {
            // لا يوجد سياق شركة حالياً – تجاهل
        }

        return null; // لم نتخذ قراراً – نستمر في فحص Policies
    });

    Gate::policy(Company::class, CompanyPolicy::class);
    \App\Models\Company::observe(\App\Observers\CompanyObserver::class);
}
}
