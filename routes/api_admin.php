<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Admin\AdminCompanyController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AdminApprovalController;
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
            // Bulk actions — before wildcard
            Route::post('bulk-suspend',    [AdminCompanyController::class, 'bulkSuspend']);
            Route::post('bulk-unsuspend',  [AdminCompanyController::class, 'bulkUnsuspend']);
            Route::post('bulk-verify',     [AdminCompanyController::class, 'bulkVerify']);
            Route::post('bulk-activate',   [AdminCompanyController::class, 'bulkActivate']);
            Route::post('bulk-deactivate', [AdminCompanyController::class, 'bulkDeactivate']);
            Route::get('export',           [AdminCompanyController::class, 'export']);
            Route::get('{companyId}',    [AdminCompanyController::class, 'show']);
            Route::put('{companyId}',    [AdminCompanyController::class, 'update']);
            Route::delete('{companyId}', [AdminCompanyController::class, 'destroy']);

            // إجراءات الشركة
            Route::post('{companyId}/suspend',      [AdminCompanyController::class, 'suspend']);
            Route::post('{companyId}/unsuspend',    [AdminCompanyController::class, 'unsuspend']);
            Route::post('{companyId}/activate',     [AdminCompanyController::class, 'activate']);
            Route::post('{companyId}/deactivate',   [AdminCompanyController::class, 'deactivate']);
            Route::post('{companyId}/verify',       [AdminCompanyController::class, 'verify']);
            Route::post('{companyId}/unverify',     [AdminCompanyController::class, 'unverify']);
            Route::post('{companyId}/change-plan',  [AdminCompanyController::class, 'changePlan']);
            Route::patch('{companyId}/notes',       [AdminCompanyController::class, 'updateNotes']);

            // أعضاء الشركة
            Route::get('{companyId}/users',                      [AdminCompanyController::class, 'users']);
            Route::post('{companyId}/users',                     [AdminCompanyController::class, 'addUser']);
            Route::delete('{companyId}/users/{user}',            [AdminCompanyController::class, 'removeUser']);
            Route::patch('{companyId}/users/{user}/toggle',      [AdminCompanyController::class, 'toggleUserStatus']);

            // ── بذر بيانات شركة محددة ─────────────────────────
            // POST /api/v1/admin/companies/{companyId}/seed
            Route::post('{companyId}/seed',          [AdminSeedController::class, 'seedCompany'])      ->name('seed');
            // POST /api/v1/admin/companies/{companyId}/seed/{seeder}
            Route::post('{companyId}/seed/{seeder}', [AdminSeedController::class, 'seedCompanySingle'])->name('seed.single');
        });

        // ══════════════════════════════════════════════════════════
        // Users
        // ══════════════════════════════════════════════════════════
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/',                       [AdminUserController::class, 'index']);
            Route::post('/',                      [AdminUserController::class, 'store']);
            // موافقات التسجيل — قبل wildcard {user}
            Route::get('pending-approval',           [AdminApprovalController::class, 'pending'])->name('pending');
            Route::post('bulk-approve',              [AdminApprovalController::class, 'bulkApprove'])->name('bulk-approve');
            Route::post('bulk-reject',               [AdminApprovalController::class, 'bulkReject'])->name('bulk-reject');
            Route::post('{user}/approve',            [AdminApprovalController::class, 'approve'])->name('approve');
            Route::post('{user}/reject',             [AdminApprovalController::class, 'reject'])->name('reject');
            Route::get('{user}',                  [AdminUserController::class, 'show']);
            Route::put('{user}',                  [AdminUserController::class, 'update']);
            Route::delete('{user}',               [AdminUserController::class, 'destroy']);
            Route::post('{user}/reset-password',  [AdminUserController::class, 'resetPassword']);
            Route::post('{user}/toggle-active',   [AdminUserController::class, 'toggleActive']);
            Route::post('{user}/toggle-approval', [AdminUserController::class, 'toggleApproval']);
            Route::get('{user}/companies',        [AdminUserController::class, 'companies']);
        });

        // ══════════════════════════════════════════════════════════
        // Plans
        // ══════════════════════════════════════════════════════════
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/',       [AdminPlanController::class, 'index']);
            Route::post('/',      [AdminPlanController::class, 'store']);
            Route::get('{planId}',  [AdminPlanController::class, 'show']);
            Route::put('{planId}',  [AdminPlanController::class, 'update']);
            Route::delete('{planId}', [AdminPlanController::class, 'destroy']);
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
