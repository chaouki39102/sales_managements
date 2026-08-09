<?php

use Illuminate\Support\Facades\Route;

// ═══════════════════════════════════════════════════════════════════
// صفحة دفع النموذج (المزوّد التجريبي) — مسارات ويب مستقلة عن الـ SPA.
// يجب تسجيلها قبل catch-all التطبيق وإلا سُلمت للواجهة كصفحة React.
// عند استبدال النموذج ببوابة حقيقية تُحذف هذه المسارات وتستضيف البوابة
// صفحتها الخاصة — لا يتغير أي شيء في مسار التطبيق (webhook).
// ═══════════════════════════════════════════════════════════════════
Route::get('/portal-gateway/mock/{reference}', [\App\Http\Controllers\Api\V1\Portal\MockGatewayController::class, 'paymentPage']);
Route::post('/portal-gateway/mock/{reference}/confirm', [\App\Http\Controllers\Api\V1\Portal\MockGatewayController::class, 'confirm']);
Route::post('/portal-gateway/mock/{reference}/cancel', [\App\Http\Controllers\Api\V1\Portal\MockGatewayController::class, 'cancel']);

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
