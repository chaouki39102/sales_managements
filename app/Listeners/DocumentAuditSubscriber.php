<?php

namespace App\Listeners;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\DocumentAuditLog;
use App\Models\Payment;
use App\Models\Traits\HasCompany;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * مسجّل تدقيق محسّن خاص بأحداث المستندات التجارية.
 * يكتب صفوفاً في document_audit_logs مع تنبيه على مستوى السطر/الحقل.
 *
 * يستمع فقط لأحداث CommercialDocument / CommercialDocumentLine / Payment
 * ويتوقع أن يمرّر عنوان المستند (document_id) + الفعل + القيم.
 *
 * آلية الكتابة: يتم استدعاء write() صراحة من السيرفر (DocumentAuditLogger)
 * للأحداث غير القياسية (price_changed, line_added, cancelled ...) لأنها
 * تتطلب سياقاً (قيم قديمة/جديدة) غير متاحة في أحداث Eloquent العامة.
 */
class DocumentAuditSubscriber
{
    /**
     * اكتب ببساطة صف تدقيق على مستند. مسجَّل في EventServiceProvider كمساعد
     * للخدمات لإرسال أحداث تدقيق دقيقة أثناء العمليات.
     */
    public function subscribe(Dispatcher $events): void
    {
        $events->listen('document.audit', function (array $payload) {
            $this->fromPayload($payload);
        });
    }

    /**
     * استقبال حمولة تدقيق {document_id, action, field_name?, old_value?, new_value?}
     * من أي خدمة (إضافة سطر، تغيير سعر، إلغاء، تحويل، ...).
     */
    public function fromPayload(array $payload): void
    {
        $documentId = $payload['document_id'] ?? null;
        $action = $payload['action'] ?? null;

        if (!$documentId || !$action) {
            return;
        }

        $this->write($documentId, $action, [
            'field_name' => $payload['field_name'] ?? null,
            'old_value'  => $payload['old_value'] ?? null,
            'new_value'  => $payload['new_value'] ?? null,
        ]);
    }

    /**
     * اكتب صف تدقيق واحد ببطء مع حماية كاملة من فشل العملية المالية.
     */
    public function write(int $documentId, string $action, array $context = []): void
    {
        // تجاهل الفعل غير المعروف (لا نفشل عملية مالية بسبب خطأ برمجي).
        if (!DocumentAuditLog::isValidAction($action)) {
            Log::warning('Unknown document audit action skipped', ['action' => $action]);
            return;
        }

        $companyId = $context['company_id'] ?? null;
        if (!$companyId) {
            $doc = CommercialDocument::query()->select('company_id')->find($documentId);
            $companyId = $doc?->company_id ?? app(CompanyContextService::class)->get();
        }

        $user = Auth::user();
        $request = app()->runningInConsole() ? null : request();

        try {
            DocumentAuditLog::create([
                'document_id' => $documentId,
                'company_id'  => $companyId,
                'user_id'     => $user?->getKey(),
                'action'      => $action,
                'field_name'  => $context['field_name'] ?? null,
                'old_value'   => $context['old_value'] ?? null,
                'new_value'   => $context['new_value'] ?? null,
                'ip_address'  => $request?->ip(),
                'user_agent'  => $request ? mb_substr((string) $request->userAgent(), 0, 1023) : null,
            ]);
        } catch (\Throwable $e) {
            // التدقيق لا يوقف أبداً عملية مالية. أخطاء القفل العابرة تُعالَج كتحذير.
            $code = (int) ($e->errorInfo[1] ?? 0);
            $isLock = $code === 5 || $code === 14
                || str_contains($e->getMessage(), 'unable to open database file')
                || str_contains($e->getMessage(), 'database is locked');
            Log::warning('Document audit write failed', [
                'document_id' => $documentId,
                'action'      => $action,
                'is_lock'     => $isLock,
                'error'       => $e->getMessage(),
            ]);
        }
    }
}