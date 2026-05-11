<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\Company;

use App\Http\Controllers\Api\V1\AdminCompanyController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\CompanyController;

/*
|--------------------------------------------------------------------------
| api_admin.php — Super Admin Routes فقط
| يُستدعى من api.php عبر: require base_path('routes/api_admin.php');
|
| ⚠️  هذا الملف لا يحتوي على require لأي ملف آخر — تجنباً للحلقة اللانهائية
|--------------------------------------------------------------------------
*/

Route::prefix('v1/admin')
    ->middleware(['auth:sanctum', 'role:super-admin'])
    ->group(function () {

        // ── الشركات ─────────────────────────────────────────────
        Route::prefix('companies')->group(function () {

            Route::get('/stats',
                fn() => app(AdminCompanyController::class)->stats());

            Route::post('/{company}/suspend',
                fn(Request $request, Company $company) =>
                app(AdminCompanyController::class)->suspend($request, $company));

            Route::post('/{company}/unsuspend',
                fn(Company $company) =>
                app(AdminCompanyController::class)->unsuspend($company));

            Route::post('/{company}/deactivate',
                fn(Company $company) =>
                app(AdminCompanyController::class)->deactivate($company));

            Route::post('/{company}/activate',
                fn(Company $company) =>
                app(AdminCompanyController::class)->activate($company));

            Route::post('/{company}/verify',
                fn(Company $company) =>
                app(AdminCompanyController::class)->verify($company));

            Route::post('/{company}/unverify',
                fn(Company $company) =>
                app(AdminCompanyController::class)->unverify($company));

            Route::patch('/{company}/plan',
                fn(Request $request, Company $company) =>
                app(AdminCompanyController::class)->changePlan($request, $company));

            Route::patch('/{company}/notes',
                fn(Request $request, Company $company) =>
                app(AdminCompanyController::class)->updateNotes($request, $company));

            Route::patch('/{company}/upgrade-plan',
                fn(Request $request, Company $company) =>
                app(CompanyController::class)->upgradePlan($request, $company->id));
        });

        // ── المستخدمون ───────────────────────────────────────────
        Route::prefix('users')->group(function () {
            Route::get('/',
                fn() => app(UserController::class)->index(request()));
            Route::get('/{user}',
                fn($user) => app(UserController::class)->show($user));
            Route::post('/{user}/toggle-active',
                fn($user) => app(UserController::class)->toggleActive($user));
            Route::delete('/{user}',
                fn($user) => app(UserController::class)->destroy($user));
        });

        // ── الأدوار والصلاحيات ───────────────────────────────────
        Route::apiResource('roles',       RoleController::class);
        Route::apiResource('permissions', PermissionController::class);

        // ── إحصاءات وسجلات ──────────────────────────────────────
        Route::get('stats',     fn() => app(AdminCompanyController::class)->stats());
        Route::get('audit-log', fn() => app(AuditController::class)->index(request()));
        Route::get('settings',  fn() => app(SettingController::class)->index(request()));
    });
