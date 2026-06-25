<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\BaseService;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * NotificationService
 *
 * ⚠️  Multi-tenancy:
 *  - كل استعلام مُصفَّر بـ company_id للشركة النشطة (current_company_id)
 *  - assertOwnership تتحقق من user_id + company_id معاً
 *  - sendToUser يأخذ company_id صراحةً من الـ User المُستهدَف
 */
class NotificationService extends BaseService
{
    protected string $model        = Notification::class;
    protected string $resourceName = 'notification';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ── Queries ───────────────────────────────────────────────

    /**
     * جلب الإشعارات غير المقروءة للمستخدم الحالي **في الشركة النشطة فقط**.
     */
    public function getUnread(): Collection
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return collect();
        }

        return Notification::query()
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id',   $user->id)
            ->where('company_id',      $companyId)   // ← عزل الـ tenant
            ->unread()
            ->latest()
            ->get();
    }

    // ── Mutations ─────────────────────────────────────────────

    /**
     * تعليم إشعار واحد كمقروء.
     * يتحقق من: user_id + company_id معاً.
     *
     * @throws BusinessRuleException
     */
    public function markAsRead(Model $notification): bool
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        $this->assertOwnership($notification, $user, $companyId);

        return $notification->markAsRead();
    }

    /**
     * تعليم جميع إشعارات المستخدم الحالي في الشركة النشطة كمقروءة.
     */
    public function markAllAsRead(): int
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return 0;
        }

        return Notification::query()
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id',   $user->id)
            ->where('company_id',      $companyId)   // ← عزل الـ tenant
            ->unread()
            ->update(['read_at' => now()]);
    }

    // ── Sending ───────────────────────────────────────────────

    /**
     * إرسال إشعار لمستخدم بعينه.
     * company_id تُستخرج دائماً من الـ User المُستهدَف.
     */
    public function sendToUser(
        User $user,
        string $type,
        string $title,
        ?string $message   = null,
        ?string $actionUrl = null,
    ): Notification {
        $companyId = $user->current_company_id ?? $user->company_id
            ?? throw new BusinessRuleException('لا يمكن تحديد الشركة للمستخدم المُستهدَف', 422);

        return Notification::create([
            'company_id'      => $companyId,
            'type'            => Notification::class,
            'notifiable_type' => get_class($user),
            'notifiable_id'   => $user->id,
            'data'            => [
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'action_url' => $actionUrl,
            ],
        ]);
    }

    /**
     * إرسال إشعار للمستخدم المصادَق عليه في الشركة **النشطة**.
     */
    public function notify(
        string $type,
        string $title,
        ?string $message   = null,
        ?string $actionUrl = null,
    ): ?Notification {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return null;
        }

        return Notification::create([
            'company_id'      => $companyId,
            'type'            => Notification::class,
            'notifiable_type' => get_class($user),
            'notifiable_id'   => $user->id,
            'data'            => [
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'action_url' => $actionUrl,
            ],
        ]);
    }

    // ── Shortcuts ─────────────────────────────────────────────

    public function success(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('success', $title, $message, $actionUrl);
    }

    public function error(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('error', $title, $message, $actionUrl);
    }

    public function warning(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('warning', $title, $message, $actionUrl);
    }

    public function info(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('info', $title, $message, $actionUrl);
    }

    // ── Private Helpers ───────────────────────────────────────

    /**
     * يجلب company_id للشركة النشطة من المستخدم المصادَق عليه.
     * يعتمد على current_company_id (الشركة التي يعمل فيها الآن).
     */
    private function resolveCurrentCompanyId(): ?int
    {
        $user = auth()->user();

        return $user?->current_company_id ?? $user?->company_id;
    }

    /**
     * يتحقق أن الإشعار يخص المستخدم الحالي **في نفس الشركة**.
     * الفحص المزدوج: user_id + company_id ← يمنع Cross-tenant access.
     *
     * @throws BusinessRuleException
     */
    private function assertOwnership(Model $notification, ?User $user, ?int $companyId): void
    {
        if (
            ! $user
            || ! $companyId
            || $notification->notifiable_id   != $user->id
            || $notification->notifiable_type !== get_class($user)
            || $notification->company_id      != $companyId       // ← الفحص الإضافي
        ) {
            throw new BusinessRuleException('ليس لديك صلاحية تعديل هذا الإشعار', 403);
        }
    }
}
