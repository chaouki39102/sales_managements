<?php

namespace App\Providers;

use App\Models\Company;
use App\Policies\CompanyPolicy;
use App\Services\CompanyContextService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CompanyContextService::class);
    }

    public function boot(): void
    {
        Gate::policy(Company::class, CompanyPolicy::class);

        // ✅ Super Admin (Spatie role) يتجاوز كل الصلاحيات بأمان
        Gate::before(function ($user, $ability) {
            // التحقق فقط باستخدام Spatie hasRole (يتجنب in_array على null)
            if (method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
                return true;
            }
            return null;
        });
    }
}
