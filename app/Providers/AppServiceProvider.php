<?php

namespace App\Providers;

use App\Models\Company;
use App\Policies\CompanyPolicy;
use App\Services\CompanyContextService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(CompanyContextService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // تسجيل Policy الخاصة بالشركة
        Gate::policy(Company::class, CompanyPolicy::class);

        // ✅ Super Admin يتجاوز كل الـ Policies
        Gate::before(function ($user, $ability) {
            if (method_exists($user, 'hasRole') && $user->hasRole('super_admin')) {
                return true;
            }
            if (isset($user->role) && in_array($user->role, ['super_admin', 'admin'])) {
                return true;
            }
            if ($user->id === 1) {
                return true;
            }
            return null;
        });
    }
}
