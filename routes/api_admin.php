<?php

use App\Http\Controllers\Api\V1\Admin\AdminCompanyController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AdminPlanController;
use App\Http\Controllers\Api\V1\Admin\AdminImpersonateController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminActivityController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin API Routes — Super Admin Only
|--------------------------------------------------------------------------
|
| يُضمَّن من api.php قبل Route::prefix('v1') مباشرةً:
|   require base_path('routes/api_admin.php');
|
| ✅ النتيجة: /api/v1/admin/*
|
| ✅ whereNumber('company') و whereNumber('user'):
|    يُجبران Laravel على البحث بالـ id الرقمي وليس slug
|    لأن Company::getRouteKeyName() يُرجع 'slug' افتراضياً
|    مما يجعل /admin/companies/2/users يبحث عن slug='2' → 404
|
*/

Route::prefix('v1/admin')
    ->middleware(['auth:sanctum', 'can:super.admin'])
    ->name('admin.')
    ->group(function () {

        // ── Dashboard ──────────────────────────────────────────────
        Route::get('dashboard', [AdminDashboardController::class, 'index'])
            ->name('dashboard');

        // ── الشركات ────────────────────────────────────────────────
        Route::prefix('companies')->name('companies.')->group(function () {
            Route::get('/',  [AdminCompanyController::class, 'index']);
            Route::post('/', [AdminCompanyController::class, 'store']);

            // ✅ whereNumber يُجبر Laravel على استخدام id وليس slug
            Route::get(   '{company}', [AdminCompanyController::class, 'show'])   ->whereNumber('company');
            Route::put(   '{company}', [AdminCompanyController::class, 'update']) ->whereNumber('company');
            Route::delete('{company}', [AdminCompanyController::class, 'destroy'])->whereNumber('company');

            Route::post('{company}/suspend',    [AdminCompanyController::class, 'suspend'])    ->whereNumber('company');
            Route::post('{company}/unsuspend',  [AdminCompanyController::class, 'unsuspend'])  ->whereNumber('company');
            Route::post('{company}/activate',   [AdminCompanyController::class, 'activate'])   ->whereNumber('company');
            Route::post('{company}/deactivate', [AdminCompanyController::class, 'deactivate']) ->whereNumber('company');
            Route::post('{company}/verify',     [AdminCompanyController::class, 'verify'])     ->whereNumber('company');
            Route::post('{company}/unverify',   [AdminCompanyController::class, 'unverify'])   ->whereNumber('company');
            Route::post('{company}/change-plan',[AdminCompanyController::class, 'changePlan']) ->whereNumber('company');
            Route::patch('{company}/notes',     [AdminCompanyController::class, 'updateNotes'])->whereNumber('company');

            Route::get(   '{company}/users',              [AdminCompanyController::class, 'users'])            ->whereNumber('company');
            Route::post(  '{company}/users',              [AdminCompanyController::class, 'addUser'])          ->whereNumber('company');
            Route::delete('{company}/users/{user}',       [AdminCompanyController::class, 'removeUser'])       ->whereNumber('company')->whereNumber('user');
            Route::patch( '{company}/users/{user}/toggle',[AdminCompanyController::class, 'toggleUserStatus']) ->whereNumber('company')->whereNumber('user');
        });

        // ── المستخدمون ─────────────────────────────────────────────
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/',  [AdminUserController::class, 'index']);
            Route::post('/', [AdminUserController::class, 'store']);

            Route::get(   '{user}',                [AdminUserController::class, 'show'])          ->whereNumber('user');
            Route::put(   '{user}',                [AdminUserController::class, 'update'])        ->whereNumber('user');
            Route::delete('{user}',                [AdminUserController::class, 'destroy'])       ->whereNumber('user');
            Route::post(  '{user}/reset-password', [AdminUserController::class, 'resetPassword']) ->whereNumber('user');
            Route::post(  '{user}/toggle-active',  [AdminUserController::class, 'toggleActive'])  ->whereNumber('user');
            Route::get(   '{user}/companies',      [AdminUserController::class, 'companies'])     ->whereNumber('user');
        });

        // ── الخطط ──────────────────────────────────────────────────
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/',      [AdminPlanController::class, 'index']);
            Route::get('{plan}', [AdminPlanController::class, 'show']);
            Route::post('/',     [AdminPlanController::class, 'store']);
            Route::put('{plan}', [AdminPlanController::class, 'update']);
        });

        // ── Impersonate ────────────────────────────────────────────
        // ⚠️ stop قبل {user} لتجنب التعارض
        Route::post('impersonate/stop',   [AdminImpersonateController::class, 'stop']);
        Route::post('impersonate/{user}', [AdminImpersonateController::class, 'start'])->whereNumber('user');

        // ── سجل النشاط ─────────────────────────────────────────────
        Route::get('activity-log',      [AdminActivityController::class, 'index']);
        Route::get('activity-log/{id}', [AdminActivityController::class, 'show'])->whereNumber('id');
    });
