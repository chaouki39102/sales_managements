<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Admin\AdminCompanyController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminActivityController;
use App\Http\Controllers\Api\V1\Admin\AdminPlanController;
use App\Http\Controllers\Api\V1\Admin\AdminImpersonateController;
use App\Http\Controllers\Api\V1\Admin\AdminSystemSettingsController;
use App\Http\Controllers\Api\V1\Admin\AdminMaintenanceController;
use App\Http\Controllers\Api\V1\Admin\AdminSystemBootController;
use App\Http\Controllers\Api\V1\Admin\AdminSeedController;

/*
|--------------------------------------------------------------------------
| Super Admin API Routes — /api/v1/admin/*
|--------------------------------------------------------------------------
*/

Route::prefix('v1/admin')
    ->middleware(['auth:sanctum', 'super.admin'])
    ->name('admin.')
    ->group(function () {

        // ══════════════════════════════════════════════════════════
        // System Boot — الإعداد الأول للنظام
        // مودال SystemBootModal يستدعي هذه الـ endpoints
        // ══════════════════════════════════════════════════════════
        Route::prefix('system')->name('system.')->group(function () {

            // حالة النظام — ما الذي تم تثبيته؟
            Route::get('status',                [AdminSystemBootController::class, 'status'])         ->name('status');

            // تثبيت كامل دفعة واحدة (ولايات + صلاحيات)
            Route::post('boot',                 [AdminSystemBootController::class, 'boot'])           ->name('boot');

            // تثبيت منفرد لكل مكوّن (للإعادة عند الحاجة)
            Route::post('boot/wilayas',         [AdminSystemBootController::class, 'bootWilayas'])    ->name('boot.wilayas');
            Route::post('boot/permissions',     [AdminSystemBootController::class, 'bootPermissions'])->name('boot.permissions');

            // إعدادات النظام
            Route::get('settings',  [AdminSystemSettingsController::class, 'index'])  ->name('settings');
            Route::put('settings',  [AdminSystemSettingsController::class, 'update']) ->name('settings.update');

            // الصيانة
            Route::get('maintenance',              [AdminMaintenanceController::class, 'status'])     ->name('maintenance');
            Route::post('maintenance/enable',      [AdminMaintenanceController::class, 'enable'])     ->name('maintenance.enable');
            Route::post('maintenance/disable',     [AdminMaintenanceController::class, 'disable'])    ->name('maintenance.disable');
            Route::post('maintenance/cache-clear', [AdminMaintenanceController::class, 'clearCache']) ->name('maintenance.cache-clear');
        });

        // ══════════════════════════════════════════════════════════
        // Dashboard
        // ══════════════════════════════════════════════════════════
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

        // ══════════════════════════════════════════════════════════
        // Companies
        // ══════════════════════════════════════════════════════════
        Route::prefix('companies')->name('companies.')->group(function () {
            Route::get('/',    [AdminCompanyController::class, 'index']);
            Route::post('/',   [AdminCompanyController::class, 'store']);
            Route::get('{company}',    [AdminCompanyController::class, 'show']);
            Route::put('{company}',    [AdminCompanyController::class, 'update']);
            Route::delete('{company}', [AdminCompanyController::class, 'destroy']);

            // إجراءات الشركة
            Route::post('{company}/suspend',      [AdminCompanyController::class, 'suspend']);
            Route::post('{company}/unsuspend',    [AdminCompanyController::class, 'unsuspend']);
            Route::post('{company}/activate',     [AdminCompanyController::class, 'activate']);
            Route::post('{company}/deactivate',   [AdminCompanyController::class, 'deactivate']);
            Route::post('{company}/verify',       [AdminCompanyController::class, 'verify']);
            Route::post('{company}/unverify',     [AdminCompanyController::class, 'unverify']);
            Route::post('{company}/change-plan',  [AdminCompanyController::class, 'changePlan']);
            Route::patch('{company}/notes',       [AdminCompanyController::class, 'updateNotes']);

            // أعضاء الشركة
            Route::get('{company}/users',                      [AdminCompanyController::class, 'users']);
            Route::post('{company}/users',                     [AdminCompanyController::class, 'addUser']);
            Route::delete('{company}/users/{user}',            [AdminCompanyController::class, 'removeUser']);
            Route::patch('{company}/users/{user}/toggle',      [AdminCompanyController::class, 'toggleUserStatus']);

            // ── بذر بيانات شركة محددة ─────────────────────────
            // POST /api/v1/admin/companies/{company}/seed
            Route::post('{company}/seed',          [AdminSeedController::class, 'seedCompany'])      ->name('seed');
            // POST /api/v1/admin/companies/{company}/seed/{seeder}
            Route::post('{company}/seed/{seeder}', [AdminSeedController::class, 'seedCompanySingle'])->name('seed.single');
        });

        // ══════════════════════════════════════════════════════════
        // Users
        // ══════════════════════════════════════════════════════════
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/',                       [AdminUserController::class, 'index']);
            Route::post('/',                      [AdminUserController::class, 'store']);
            Route::get('{user}',                  [AdminUserController::class, 'show']);
            Route::put('{user}',                  [AdminUserController::class, 'update']);
            Route::delete('{user}',               [AdminUserController::class, 'destroy']);
            Route::post('{user}/reset-password',  [AdminUserController::class, 'resetPassword']);
            Route::post('{user}/toggle-active',   [AdminUserController::class, 'toggleActive']);
            Route::get('{user}/companies',        [AdminUserController::class, 'companies']);
        });

        // ══════════════════════════════════════════════════════════
        // Plans
        // ══════════════════════════════════════════════════════════
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/',       [AdminPlanController::class, 'index']);
            Route::get('{plan}',  [AdminPlanController::class, 'show']);
        });

        // ══════════════════════════════════════════════════════════
        // Impersonate
        // ══════════════════════════════════════════════════════════
        Route::post('impersonate/stop',    [AdminImpersonateController::class, 'stop']);
        Route::post('impersonate/{user}',  [AdminImpersonateController::class, 'start']);

        // ══════════════════════════════════════════════════════════
        // Activity Log
        // ══════════════════════════════════════════════════════════
        Route::get('activity-log',       [AdminActivityController::class, 'index']);
        Route::get('activity-log/{id}',  [AdminActivityController::class, 'show']);
    });
