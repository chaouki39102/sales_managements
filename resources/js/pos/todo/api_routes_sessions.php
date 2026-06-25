<?php
// ════════════════════════════════════════════════════════════════════════════
// routes/api.php — أضف هذا الكود داخل Route::prefix('{company}')
// بعد routes المستندات مباشرة
// ════════════════════════════════════════════════════════════════════════════

use App\Http\Controllers\Api\PosSessionController;

/*
|--------------------------------------------------------------------------
| POS Sessions
|--------------------------------------------------------------------------
*/
Route::prefix('pos-sessions')->group(function () {
    // الجلسة المفتوحة للمستخدم الحالي
    Route::get('current', [PosSessionController::class, 'current']);

    // فتح جلسة جديدة
    Route::post('/', [PosSessionController::class, 'open']);

    // تسجيل بيع في الجلسة (بعد كل فاتورة)
    Route::post('{session}/increment', [PosSessionController::class, 'increment']);

    // إغلاق الجلسة
    Route::post('{session}/close', [PosSessionController::class, 'close']);

    // قائمة الجلسات (للمدير)
    Route::get('/', [PosSessionController::class, 'index']);

    // تفاصيل جلسة واحدة
    Route::get('{session}', [PosSessionController::class, 'show']);
});
