<?php

// ════════════════════════════════════════════════════════════════════════════
// routes/api.php — إضافات جديدة
// أضف هذه الـ routes داخل group tenant الموجود
// ════════════════════════════════════════════════════════════════════════════

use App\Http\Controllers\Api\V1\DocumentComputeController;

// داخل Route::prefix('{company}')->group() الموجود:

// ── حساب السطر والإجماليات ────────────────────────────────────────────────
Route::post('documents/compute-line',   [DocumentComputeController::class, 'computeLine']);
Route::post('documents/compute-totals', [DocumentComputeController::class, 'computeTotals']);

// ── تحويل المستند ─────────────────────────────────────────────────────────
Route::post('documents/{document}/convert', [DocumentComputeController::class, 'convert']);
Route::get ('documents/{document}/chain',   [DocumentComputeController::class, 'chain']);

// ── مرتجع ─────────────────────────────────────────────────────────────────
Route::post('documents/{document}/return',  [DocumentComputeController::class, 'createReturn']);

// ── دفعات إضافية (additive mode) ─────────────────────────────────────────
Route::post('documents/{document}/payments', [CommercialDocumentController::class, 'addPayments']);

// ── فحص الائتمان ──────────────────────────────────────────────────────────
Route::get('parties/{party}/credit-check', [DocumentComputeController::class, 'creditCheck']);
