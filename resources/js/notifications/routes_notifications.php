<?php

// ─────────────────────────────────────────────────────────────
//  routes/notifications.php
//  أضف هذا الـ require في routes/api.php داخل مجموعة auth:sanctum
// ─────────────────────────────────────────────────────────────
//
//  مثال في routes/api.php:
//
//  Route::middleware(['auth:sanctum', 'set.company'])->group(function () {
//      require __DIR__ . '/notifications.php';
//      // ... باقي الـ routes
//  });
// ─────────────────────────────────────────────────────────────

use App\Http\Controllers\Api\V1\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->controller(NotificationController::class)->group(function () {
    Route::get('/unread',        'unread');          // GET  /notifications/unread
    Route::post('/{id}/read',    'markAsRead');       // POST /notifications/{id}/read
    Route::post('/read-all',     'markAllAsRead');    // POST /notifications/read-all
});
