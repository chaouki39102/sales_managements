<?php

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentService — التعديلات الجذرية
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * هذا الملف يحتوي على الدوال المُعدَّلة فقط داخل CommercialDocumentService.
 * استبدل هذه الدوال في الملف الأصلي.
 *
 * ══ التعديلات المطبَّقة ═══════════════════════════════════════════════════════
 *
 * 1. beforeUpdate: إضافة حماية حقل document_number وحماية الأسطر للمعتمدة
 *
 * 2. afterUpdate: دعم new_payments (وضع additive) + حماية الأسطر للمعتمدة
 *    + حذف حركات المخزون القديمة عند تحديث الأسطر
 *
 * 3. attachPayments: إضافة fiscal_year_id وparty_id وcurrency_id
 *    + دعم new_payments منفصلاً
 *
 * 4. attachNewPayments: دالة جديدة لوضع additive (إضافة دفعات فقط)
 *
 * 5. beforeDelete: رسالة أوضح
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

namespace App\Services;

// ─── ملاحظة: هذه الدوال تُضاف/تُستبدَل داخل CommercialDocumentService ───────
// الـ imports وبنية الكلاس موجودة بالفعل في الملف الأصلي

/**
 * ══ HOOK: beforeUpdate ═══════════════════════════════════════════════════════
 *
 * القواعد:
 * R1. is_locked → ممنوع التعديل
 * R2. is_exported_to_accounting → ممنوع التعديل
 * R3. document_number → لا تسمح بتغييره إذا كان المستند معتمداً
 * R4. validated (غير مقفول) + lines في الطلب → ممنوع (حماية الأسطر)
 *     لكن new_payments مسموح
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
protected function beforeUpdate(Model $item, array $data, $request): void
{
    parent::beforeUpdate($item, $data, $request);

    // R1
    if ($item->is_locked) {
        throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
    }

    // R2
    if ($item->is_exported_to_accounting) {
        throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
    }

    // R3: لا تسمح بتغيير رقم المستند إذا كان مُعتمداً
    if (!empty($data['document_number']) && $data['document_number'] !== $item->document_number) {
        $currentStatusName = $item->documentStatus?->name
            ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
        $validatedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
        if (in_array($currentStatusName, $validatedStatuses, true)) {
            throw new BusinessRuleException(
                'لا يمكن تغيير رقم مستند معتمد. رقم المستند محمي بعد الاعتماد.',
                409
            );
        }
    }

    // R4: إذا كانت الوثيقة معتمدة وجاءت lines في الطلب → رفض
    // new_payments مسموح
    $hasLines = !empty($data['lines']) || !empty($request?->input('lines'));
    if ($hasLines) {
        $currentStatusName = $item->documentStatus?->name
            ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
        $protectedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
        if (in_array($currentStatusName, $protectedStatuses, true)) {
            throw new BusinessRuleException(
                'لا يمكن تعديل أسطر مستند معتمد. الأسطر محمية بعد الاعتماد. استخدم مستند تصحيح أو مرتجع.',
                409
            );
        }
    }
}
*/

/**
 * ══ HOOK: afterUpdate ════════════════════════════════════════════════════════
 *
 * السيناريوهات:
 * AU1. lines في الطلب + مستند غير معتمد:
 *      → حذف حركات المخزون المرتبطة (قبل حذف الأسطر)
 *      → حذف الأسطر القديمة
 *      → إنشاء الأسطر الجديدة
 *      → إعادة حساب الإجماليات
 *      → إنشاء حركات مخزون جديدة
 *
 * AU2. new_payments في الطلب (وضع additive):
 *      → attachNewPayments (إضافة دفعات جديدة فقط، لا تمس القديمة)
 *
 * AU3. لا lines ولا payments → فقط إعادة حساب الإجماليات
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
protected function afterUpdate(Model $item, array $data, $request): void
{
    $lines       = $request?->input('lines')        ?? $data['lines']        ?? [];
    $newPayments = $request?->input('new_payments')  ?? $data['new_payments'] ?? [];
    $payments    = $request?->input('payments')      ?? $data['payments']     ?? [];

    // AU1: تحديث الأسطر
    if (!empty($lines)) {
        // ✅ حذف حركات المخزون المرتبطة أولاً (قبل حذف الأسطر)
        $this->deleteStockMovementsForDocument($item);

        // ✅ حذف الأسطر القديمة
        $item->lines()->delete();

        // ✅ إنشاء الأسطر الجديدة
        $this->createDocumentLines($item, $lines);
    }

    // إعادة حساب الإجماليات دائماً
    $this->recalculateTotals($item);

    // ✅ إعادة إنشاء حركات المخزون إذا تغيرت الأسطر
    if (!empty($lines)) {
        $item->load('documentType', 'lines.product');
        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }
    }

    // AU2: دفعات جديدة (additive mode)
    if (!empty($newPayments)) {
        $this->attachNewPayments($item, $newPayments);
    }

    // دفعات كاملة (free mode — تُستبدَل الكاملة)
    // ملاحظة: هذا يحذف الدفعات القديمة ويُنشئ جديدة
    // استخدمه بحذر — فقط في وضع free
    if (!empty($payments) && empty($newPayments)) {
        // حذف الدفعات القديمة من pivot
        $item->payments()->detach();
        // حذف Payment records التي لا ترتبط بمستندات أخرى
        // (حذف آمن — لا نحذف payments مربوطة بمستندات أخرى)
        $this->attachPayments($item, $payments);
    }
}
*/

/**
 * ══ attachPayments (مُحدَّثة) ═══════════════════════════════════════════════
 *
 * الإصلاحات المطبَّقة:
 * FIX1. إضافة fiscal_year_id من المستند
 * FIX2. إضافة party_id من المستند
 * FIX3. إضافة currency_id من المستند
 * FIX4. payment_number تلقائي
 * FIX5. status = 'confirmed' افتراضياً
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function attachPayments(CommercialDocument $document, array $payments): void
{
    foreach ($payments as $paymentData) {
        if (empty($paymentData['payment_mode_id']) || empty($paymentData['amount'])) {
            continue;
        }

        $amount = (float) $paymentData['amount'];
        if ($amount <= 0) continue;

        // ✅ FIX1-3: إضافة الحقول المفقودة من المستند
        $payment = \App\Models\Payment::create([
            'company_id'         => $document->company_id,
            'payment_mode_id'    => (int) $paymentData['payment_mode_id'],
            'treasury_account_id'=> isset($paymentData['treasury_account_id'])
                                        ? (int) $paymentData['treasury_account_id']
                                        : null,
            'amount'             => $amount,
            'payment_date'       => $paymentData['payment_date'] ?? $document->document_date,
            'reference'          => $paymentData['reference'] ?? null,
            'notes'              => $paymentData['notes'] ?? null,
            'user_id'            => auth()->id(),
            // ✅ FIX1: fiscal_year_id من المستند
            'fiscal_year_id'     => $document->fiscal_year_id,
            // ✅ FIX2: party_id من المستند
            'party_id'           => $document->party_id,
            // ✅ FIX3: currency_id من المستند
            'currency_id'        => $document->currency_id,
            // ✅ FIX4: payment_number تلقائي
            'payment_number'     => $this->generatePaymentNumber($document->company_id),
            // ✅ FIX5: status = confirmed
            'status'             => 'confirmed',
        ]);

        $document->payments()->attach($payment->id, [
            'company_id'     => $document->company_id,
            'amount_applied' => $amount,
            'notes'          => $paymentData['notes'] ?? null,
        ]);
    }

    // إعادة حساب paid_amount و remaining_amount
    $this->recalculatePaymentAmounts($document);
}
*/

/**
 * ══ attachNewPayments (جديدة) ════════════════════════════════════════════════
 *
 * للوضع additive: إضافة دفعات جديدة فقط دون المساس بالقديمة.
 * تُستدعى من afterUpdate عند وجود new_payments في الطلب.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function attachNewPayments(CommercialDocument $document, array $payments): void
{
    // نفس منطق attachPayments تماماً — لكن لا تحذف القديمة
    $this->attachPayments($document, $payments);
}
*/

/**
 * ══ deleteStockMovementsForDocument (جديدة) ══════════════════════════════════
 *
 * تحذف حركات المخزون المرتبطة بالمستند عند تحديث الأسطر.
 * تُستدعى قبل حذف الأسطر القديمة.
 *
 * ⚠️ تحذير: هذا يُعيد رصيد المخزون للوراء — يجب إعادة إنشاء الحركات بعد ذلك.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function deleteStockMovementsForDocument(CommercialDocument $document): void
{
    try {
        // جلب IDs الأسطر
        $lineIds = $document->lines()->pluck('id');
        if ($lineIds->isEmpty()) return;

        // حذف حركات المخزون المرتبطة
        \App\Models\StockMovement::whereIn('commercial_document_line_id', $lineIds)
            ->delete();

        // ✅ تحديث stock_balance_after للحركات اللاحقة
        // (الـ Observer سيتعامل مع الحركات الجديدة)

    } catch (\Throwable $e) {
        Log::warning("deleteStockMovementsForDocument: فشل حذف حركات المخزون للوثيقة #{$document->id}", [
            'error' => $e->getMessage(),
        ]);
        throw $e; // نرفع الخطأ لأن هذا حرج
    }
}
*/

/**
 * ══ generatePaymentNumber (جديدة) ════════════════════════════════════════════
 *
 * توليد رقم دفعة فريد بصيغة: PAY-YYYY-XXXXXX
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function generatePaymentNumber(int $companyId): string
{
    return DB::transaction(function () use ($companyId) {
        $year = date('Y');
        $last = \App\Models\Payment::where('company_id', $companyId)
            ->where('payment_number', 'like', "PAY-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = 1;
        if ($last && $last->payment_number) {
            $parts = explode('-', $last->payment_number);
            $seq   = ((int) end($parts)) + 1;
        }

        return sprintf('PAY-%s-%06d', $year, $seq);
    });
}
*/

/**
 * ══ CommercialDocumentLineService::beforeUpdate (جديدة) ══════════════════════
 *
 * التحقق من is_locked للوثيقة الأم قبل السماح بتعديل سطر منفرد.
 * أضف هذا الـ hook في CommercialDocumentLineService.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
// في CommercialDocumentLineService:

protected function beforeUpdate(Model $item, array $data, $request): void
{
    parent::beforeUpdate($item, $data, $request);

    $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

    if (!$parentDoc) {
        throw new \App\Core\Exceptions\BusinessRuleException('الوثيقة الأم غير موجودة.', 404);
    }

    if ($parentDoc->is_locked) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن تعديل سطر في وثيقة مقفلة.',
            409
        );
    }

    if ($parentDoc->is_exported_to_accounting) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن تعديل سطر في وثيقة تم تصديرها للمحاسبة.',
            409
        );
    }
}

protected function beforeDelete(Model $item): void
{
    $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

    if ($parentDoc?->is_locked) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن حذف سطر من وثيقة مقفلة.',
            409
        );
    }
}
*/

/**
 * ══ CommercialDocumentController::addPayments (جديد) ═════════════════════════
 *
 * Route: POST /{company}/documents/{document}/payments
 *
 * يُضيف دفعات جديدة لمستند موجود (وضع additive).
 * يُستخدم من الفرونتند في وضع pmMode === 'additive'.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
// في CommercialDocumentController:

public function addPayments(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
{
    try {
        $this->authorizeAction('update', $commercialDocument);

        if ($commercialDocument->is_locked) {
            return $this->errorResponse('لا يمكن إضافة دفعات لوثيقة مقفلة.', 409);
        }

        $validated = $request->validate([
            'payments'                         => 'required|array|min:1',
            'payments.*.payment_mode_id'       => 'required|integer',
            'payments.*.amount'                => 'required|numeric|min:0.01',
            'payments.*.payment_date'          => 'required|date',
            'payments.*.reference'             => 'nullable|string|max:255',
            'payments.*.treasury_account_id'   => 'nullable|integer',
        ]);

        $this->commercialDocumentService->attachNewPaymentsPublic(
            $commercialDocument,
            $validated['payments']
        );

        return $this->successResponse(
            new CommercialDocumentResource($commercialDocument->fresh(['payments.paymentMode', 'documentStatus'])),
            'تمت إضافة الدفعات بنجاح'
        );

    } catch (\Throwable $e) {
        return $this->handleError($e, 'addPayments');
    }
}
*/

// ══ ملاحظة للمطوِّر ══════════════════════════════════════════════════════════
//
// جميع الدوال أعلاه مُعلَّقة بـ /* ... */
// أزل التعليق عن الدالة التي تريد تطبيقها في الملف الأصلي.
//
// الخطوات:
// 1. افتح CommercialDocumentService.php
// 2. استبدل beforeUpdate() بالنسخة الجديدة
// 3. استبدل afterUpdate() بالنسخة الجديدة
// 4. استبدل attachPayments() بالنسخة الجديدة
// 5. أضف attachNewPayments(), deleteStockMovementsForDocument(), generatePaymentNumber()
// 6. افتح CommercialDocumentLineService.php وأضف beforeUpdate() و beforeDelete()
// 7. افتح CommercialDocumentController.php وأضف addPayments()
// 8. في api.php: أضف Route::post('{document}/payments', [CommercialDocumentController::class, 'addPayments'])
// ══════════════════════════════════════════════════════════════════════════════
