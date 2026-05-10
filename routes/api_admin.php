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
| يُضمَّن من api.php داخل Route::prefix('v1'):
|   require base_path('routes/api_admin.php');
|
| ✅ 'super-admin' مطابق لما هو مسجّل في bootstrap/app.php
| ✅ 'auth:sanctum' وليس 'api.auth'
|
*/

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'super.admin'])
    ->name('admin.')
    ->group(function () {

        // ── Dashboard ──────────────────────────────────────────────
        Route::get('dashboard', [AdminDashboardController::class, 'index'])
            ->name('dashboard');

        // ── الشركات ────────────────────────────────────────────────
        Route::prefix('companies')->name('companies.')->group(function () {
            Route::get('/',       [AdminCompanyController::class, 'index']);
            Route::post('/',      [AdminCompanyController::class, 'store']);
            Route::get('{company}',    [AdminCompanyController::class, 'show']);
            Route::put('{company}',    [AdminCompanyController::class, 'update']);
            Route::delete('{company}', [AdminCompanyController::class, 'destroy']);

            Route::post('{company}/suspend',              [AdminCompanyController::class, 'suspend']);
            Route::post('{company}/unsuspend',            [AdminCompanyController::class, 'unsuspend']);
            Route::post('{company}/activate',             [AdminCompanyController::class, 'activate']);
            Route::post('{company}/deactivate',           [AdminCompanyController::class, 'deactivate']);
            Route::post('{company}/verify',               [AdminCompanyController::class, 'verify']);
            Route::post('{company}/unverify',             [AdminCompanyController::class, 'unverify']);
            Route::post('{company}/change-plan',          [AdminCompanyController::class, 'changePlan']);
            Route::patch('{company}/notes',               [AdminCompanyController::class, 'updateNotes']);

            Route::get('{company}/users',                 [AdminCompanyController::class, 'users']);
            Route::post('{company}/users',                [AdminCompanyController::class, 'addUser']);
            Route::delete('{company}/users/{user}',       [AdminCompanyController::class, 'removeUser']);
            Route::patch('{company}/users/{user}/toggle', [AdminCompanyController::class, 'toggleUserStatus']);
        });

        // ── المستخدمون ─────────────────────────────────────────────
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/',                      [AdminUserController::class, 'index']);
            Route::post('/',                     [AdminUserController::class, 'store']);
            Route::get('{user}',                 [AdminUserController::class, 'show']);
            Route::put('{user}',                 [AdminUserController::class, 'update']);
            Route::delete('{user}',              [AdminUserController::class, 'destroy']);
            Route::post('{user}/reset-password', [AdminUserController::class, 'resetPassword']);
            Route::post('{user}/toggle-active',  [AdminUserController::class, 'toggleActive']);
            Route::get('{user}/companies',       [AdminUserController::class, 'companies']);
        });

        // ── الخطط ──────────────────────────────────────────────────
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/',      [AdminPlanController::class, 'index']);
            Route::get('{plan}', [AdminPlanController::class, 'show']);
            Route::post('/',     [AdminPlanController::class, 'store']);
            Route::put('{plan}', [AdminPlanController::class, 'update']);
        });

        // ── Impersonate ────────────────────────────────────────────
        Route::post('impersonate/stop', [AdminImpersonateController::class, 'stop']);
        Route::post('impersonate/{user}', [AdminImpersonateController::class, 'start']);

        // ── سجل النشاط ─────────────────────────────────────────────
        Route::get('activity-log',      [AdminActivityController::class, 'index']);
        Route::get('activity-log/{id}', [AdminActivityController::class, 'show']);
    });
