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
<<<<<<< HEAD
        // ✅ تحليل {company} بالـ slug وليس بالـ id
        // يُصلح خطأ "No query results for model Company"
        // عند استخدام Route::prefix('{company}') مع SubstituteBindings
        Route::bind('company', function (string $value) {
=======
        // ═══════════════════════════════════════════
        // Explicit Route Model Binding: {company} → Company by slug
        // ═══════════════════════════════════════════
        Route::bind('company', function ($value) {
            if ($value instanceof Company) {
                return $value;
            }
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
            return Company::where('slug', $value)->firstOrFail();
        });

        Gate::policy(Company::class, CompanyPolicy::class);

        // ✅ Super Admin (Spatie role) يتجاوز كل الصلاحيات بأمان
        Gate::before(function ($user, $ability) {
            if (method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
                return true;
            }
            return null;
        });
    }
}
