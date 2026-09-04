<?php

namespace App\Services;

use Illuminate\Support\Facades\Event;

/**
 * مساعد كتابة أحداث تدقيق المستندات.
 *
 * الاستخدام داخل أي خدمة/تحكّم:
 *   DocumentAuditLogger::log($documentId, 'price_changed', [
 *       'field_name' => 'unit_price_ht',
 *       'old_value'  => 100,
 *       'new_value'  => 120,
 *   ]);
 *
 * يبث حدث 'document.audit' الذي يلتقطه DocumentAuditSubscriber ويكتب
 * صفاً في document_audit_logs. لا يفشل أبداً العملية المالية (محميّ داخل
 * المستمعين). لا شيء مطلوب في السياق إن لم يُمرَّر company_id — يُستنتج
 * من المستند إن وُجد وإلا من السياق الحالي.
 */
class DocumentAuditLogger
{
    public static function log(
        int $documentId,
        string $action,
        array $context = []
    ): void {
        // نمرّر الحمولة داخل مصفوفة واحدة لأن Event::dispatch يفرد عناصر
        // المصفوفة كحجج موضعية عند استدعاء المستمع — نضمن وصول المستمع
        // إلى كامل الحمولة في متغير واحد (array $payload).
        Event::dispatch('document.audit', [array_merge($context, [
            'document_id' => $documentId,
            'action'      => $action,
        ])]);
    }
}