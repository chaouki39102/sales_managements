<?php

namespace App\Providers;

use App\Models\CommercialDocument;
use App\Models\Company;
use App\Observers\CommercialDocumentObserver;
use App\Observers\CompanyObserver;
use App\Policies\CompanyPolicy;
use App\Services\CompanyContextService;
use App\Support\Database\RetryingSQLiteConnection;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singleton — يبقى نفس الـ instance طوال دورة حياة الطلب
        $this->app->singleton(CompanyContextService::class);
    }

    public function boot(): void
    {
        // ══════════════════════════════════════════════════════
        // SQLite — transient Windows file-lock retry
        // ══════════════════════════════════════════════════════

        // Windows Defender / Search Indexer can momentarily lock database.sqlite
        // (or its -journal/-wal sibling) during a write → SQLite error 14
        // "unable to open database file" (CANTOPEN) or 5 "database is locked".
        // Replace the stock sqlite connection with a retrying variant so a
        // transient lock never 500s a POS payment (the statement is rolled back
        // at statement level, so retry is safe).
        Connection::resolverFor('sqlite', static function ($connection, $database, $prefix, $config) {
            return new RetryingSQLiteConnection($connection, $database, $prefix, $config);
        });

        // ══════════════════════════════════════════════════════
        // Route Binding
        // ══════════════════════════════════════════════════════

        // ✅ تحليل {company} بالـ slug وليس بالـ id
        Route::bind('company', function (string $value) {
            return Company::where('slug', $value)->firstOrFail();
        });

        // ══════════════════════════════════════════════════════
        // Gate
        // ══════════════════════════════════════════════════════

        /**
         * ✅ Super Admin يتجاوز كل الصلاحيات
         * ✅ مالك الشركة الحالية يمتلك صلاحيات مطلقة داخل شركته
         *
         * Gate::before يُشغَّل قبل أي Policy — إذا أعاد null
         * يستمر Laravel في فحص الـ Policies الاعتيادية.
         */
        Gate::before(function ($user, $ability) {
            // Super Admin (Spatie role)
            if (method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
                return true;
            }

            // مالك الشركة الحالية
            try {
                $companyId = app(CompanyContextService::class)->get();
                if ($companyId) {
                    $company = Company::find($companyId);
                    if ($company && $company->owner_id === $user->id) {
                        return true;
                    }
                }
            } catch (\RuntimeException $e) {
                // لا يوجد سياق شركة — نستمر في فحص Policies
            }

            return null; // لم نتخذ قراراً — نستمر
        });

        Gate::policy(Company::class, CompanyPolicy::class);

        // ══════════════════════════════════════════════════════
        // Observers
        // ══════════════════════════════════════════════════════

        Company::observe(CompanyObserver::class);

        // ✅ CommercialDocumentObserver لم يكن مسجّلاً في أي Provider
        // EventServiceProvider يسجّل LineObserver وStockMovementObserver فقط
        // CommercialDocument::observe(CommercialDocumentObserver::class);
    }
}
