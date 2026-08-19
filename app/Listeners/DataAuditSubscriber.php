<?php

namespace App\Listeners;

use App\Core\Traits\AuditableEnhanced;
use App\Models\Audit;
use App\Models\Traits\HasCompany;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * يسجّل كل عمليات الإنشاء/التعديل/الحذف على جميع النماذج المرتبطة بشركة
 * (HasCompany) في جدول audits — بدون الحاجة لتسجيل Observer لكل نموذج.
 *
 * يعتمد على أحداث Eloquent العامة (eloquent.created / updated / deleted)
 * ويستبعد نموذج Audit نفسه لمنع التكرار اللانهائي.
 */
class DataAuditSubscriber
{
    /**
     * نماذج تُستثنى من التسجيل.
     * Audit ممنوع إزالته — منعاً للتكرار اللانهائي.
     */
    protected array $excluded = [
        Audit::class,
    ];

    public function subscribe(Dispatcher $events): void
    {
        $events->listen('eloquent.created: *', [$this, 'handleCreated']);
        $events->listen('eloquent.updated: *', [$this, 'handleUpdated']);
        $events->listen('eloquent.deleted: *', [$this, 'handleDeleted']);
    }

    public function handleCreated(string $eventName, array $payload): void
    {
        $model = $payload[0] ?? null;
        if (!$model instanceof Model || !$this->shouldAudit($model)) {
            return;
        }

        $this->write($model, 'created', [], $model->getAttributes());
    }

    public function handleUpdated(string $eventName, array $payload): void
    {
        $model = $payload[0] ?? null;
        if (!$model instanceof Model || !$this->shouldAudit($model)) {
            return;
        }

        $changes = $model->getChanges();
        if ($changes === []) {
            return;
        }

        $old = [];
        $new = [];
        foreach (array_keys($changes) as $key) {
            $old[$key] = $model->getOriginal($key);
            $new[$key] = $model->getAttribute($key);
        }

        $this->write($model, 'updated', $old, $new);
    }

    public function handleDeleted(string $eventName, array $payload): void
    {
        $model = $payload[0] ?? null;
        if (!$model instanceof Model || !$this->shouldAudit($model)) {
            return;
        }

        $this->write($model, 'deleted', $model->getAttributes(), []);
    }

    private function shouldAudit(Model $model): bool
    {
        $class = get_class($model);
        if (in_array($class, $this->excluded, true)) {
            return false;
        }

        $uses = class_uses_recursive($model);

        // النماذج التي تسجّل تدقيقها بنفسها (AuditableEnhanced) تُستثنى هنا
        // لمنع كتابة صفّين لنفس الحدث (مشكلة التكرار المكتشفة في Phase 79).
        if (in_array(AuditableEnhanced::class, $uses, true)) {
            return false;
        }

        return in_array(HasCompany::class, $uses, true);
    }

    private function write(Model $model, string $event, array $oldValues, array $newValues): void
    {
        $companyId = $model->getAttribute('company_id') ?? app(CompanyContextService::class)->get();

        $user = Auth::user();

        $request = app()->runningInConsole() ? null : request();

        try {
            Audit::create([
                'company_id'     => $companyId,
                'user_id'        => $user?->getKey(),
                'user_type'      => $user ? get_class($user) : null,
                'event'          => $event,
                'auditable_type' => get_class($model),
                'auditable_id'   => $model->getKey(),
                'old_values'     => $oldValues,
                'new_values'     => $newValues,
                'url'            => $request?->fullUrl(),
                'ip_address'     => $request?->ip(),
                'user_agent'     => $request ? mb_substr((string) $request->userAgent(), 0, 1023) : null,
                'tags'           => null,
            ]);
        } catch (\Throwable $e) {
            // تدوين التدقيق لا يجب أبداً أن يفشل عملية مالية (بيع/دفع/تحويل).
            // CANTOPEN/LOCKED during Windows Defender scans is transient — warn only.
            $code = (int) ($e->errorInfo[1] ?? 0);
            $isLock = $code === 5 || $code === 14
                || str_contains($e->getMessage(), 'unable to open database file')
                || str_contains($e->getMessage(), 'database is locked');
            if ($isLock) {
                Log::warning('Audit skipped (transient DB lock)', [
                    'model' => get_class($model),
                    'event' => $event,
                ]);
            } else {
                Log::error('Failed to record audit event', [
                    'model' => get_class($model),
                    'event' => $event,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
