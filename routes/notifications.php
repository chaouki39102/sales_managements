<?php

use App\Http\Controllers\Api\V1\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->controller(NotificationController::class)->group(function () {
    Route::get('/',                'index');
    Route::get('/unread',          'unread');
    Route::post('/{id}/read',      'markAsRead');
    Route::post('/read-all',       'markAllAsRead');
    Route::delete('/{id}',         'destroy');
    Route::post('/delete-multiple','deleteMultiple');
});
