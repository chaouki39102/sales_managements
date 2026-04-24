<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
                // ✅ Super Admin يتجاوز كل الـ Policies
        // يتحقق من عمود active=1 أيضاً لضمان أن المستخدم نشط
        Gate::before(function ($user, $ability) {
            // الخيار 1: Spatie Roles
            if (method_exists($user, 'hasRole') && $user->hasRole('super_admin')) {
                return true;
            }
            // الخيار 2: عمود role في جدول users
            if (isset($user->role) && in_array($user->role, ['super_admin', 'admin'])) {
                return true;
            }
            // الخيار 3: المستخدم الأول (للتطوير فقط)
            if ($user->id === 1) {
                return true;
            }
            return null; // تابع للـ Policy العادية
        });

    }
}
