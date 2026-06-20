<?php

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * أضف هذه الدالة داخل CommercialDocumentService
 * بعد دالة cancelDocument()
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * validateDocument — تحقق يدوي من مستند (draft → validated)
 *
 * يُستدعى من CommercialDocumentController::validateDocument()
 * عند الضغط على زر "اعتماد" من صفحة القائمة.
 *
 * المستند في النظام الحالي يُنشأ مباشرةً بحالة validated.
 * هذه الدالة للمستقبل إذا أُضيف وضع draft.
 */
public function validateDocument(CommercialDocument $document, $request = null): void
{
    $companyId = $document->company_id;

    if ($document->is_locked) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن اعتماد وثيقة مقفلة.',
            409
        );
    }

    $currentStatus = $document->documentStatus?->name
        ?? \App\Models\DocumentStatus::where('id', $document->document_status_id)->value('name');

    if (in_array($currentStatus, ['validated', 'paid', 'partially_paid', 'overdue'], true)) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'المستند معتمد بالفعل.',
            409
        );
    }

    if (in_array($currentStatus, ['cancelled', 'returned'], true)) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن اعتماد مستند ملغى أو مرتجع.',
            409
        );
    }

    if ($document->lines()->count() === 0) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن اعتماد مستند بدون أسطر.',
            422
        );
    }

    $validatedStatusId = $this->getStatusId($companyId, 'validated');

    if (!$validatedStatusId) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            "لم يُعثر على حالة 'validated' للشركة #{$companyId}",
            500
        );
    }

    $document->updateQuietly([
        'document_status_id' => $validatedStatusId,
        'validated_at'       => now(),
        'validated_by'       => auth()->id(),
    ]);

    // إنشاء حركات المخزون إذا كانت الوثيقة تؤثر على المخزون
    $document->load('documentType', 'lines.product');

    if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
        // تحقق أنه لا توجد حركات سابقة
        $existingMovements = \App\Models\StockMovement::whereHas('commercialDocumentLine', function ($q) use ($document) {
            $q->where('commercial_document_id', $document->id);
        })->exists();

        if (!$existingMovements) {
            $this->createStockMovements($document);
        }
    }
}
