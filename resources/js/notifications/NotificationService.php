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
 * منطق الأعمال لوحدة الإشعارات:
 *  - جلب الإشعارات غير المقروءة
 *  - تعليم إشعار أو الكل كمقروء
 *  - إرسال إشعار لمستخدم واحد أو مجموعة
 *  - دوال مختصرة: success, error, warning, info
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
     * جلب الإشعارات غير المقروءة للمستخدم المصادَق عليه.
     */
    public function getUnread(): Collection
    {
        $user = auth()->user();

        if (! $user) {
            return collect();
        }

        return $user->notifications()->unread()->latest()->get();
    }

    // ── Mutations ─────────────────────────────────────────────

    /**
     * تعليم إشعار واحد كمقروء — يتحقق أن الإشعار يخص المستخدم الحالي.
     *
     * @throws BusinessRuleException
     */
    public function markAsRead(Model $notification): bool
    {
        $user = auth()->user();

        $this->assertOwnership($notification, $user);

        return $notification->markAsRead();
    }

    /**
     * تعليم جميع الإشعارات غير المقروءة للمستخدم الحالي.
     */
    public function markAllAsRead(): int
    {
        $user = auth()->user();

        if (! $user) {
            return 0;
        }

        return $user->notifications()->unread()->update(['read_at' => now()]);
    }

    // ── Sending ───────────────────────────────────────────────

    /**
     * إرسال إشعار لمستخدم واحد.
     *
     * @param  User   $user
     * @param  string $type        success | error | warning | info
     * @param  string $title
     * @param  string|null $message
     * @param  string|null $actionUrl
     */
    public function sendToUser(
        User $user,
        string $type,
        string $title,
        ?string $message  = null,
        ?string $actionUrl = null,
    ): Notification {
        return $user->notifications()->create([
            'company_id'      => $user->current_company_id ?? $user->company_id,
            'notifiable_type' => get_class($user),
            'notifiable_id'   => $user->id,
            'type'            => Notification::class, // مطلوب بـ Laravel Notifications morph
            'data'            => compact('type', 'title', 'message', 'actionUrl'),
        ]);
    }

    /**
     * إرسال إشعار للمستخدم المصادَق عليه حالياً (اختصار).
     */
    public function notify(
        string $type,
        string $title,
        ?string $message  = null,
        ?string $actionUrl = null,
    ): ?Notification {
        $user = auth()->user();

        if (! $user) {
            return null;
        }

        return $this->sendToUser($user, $type, $title, $message, $actionUrl);
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
     * يتحقق أن الإشعار يخص المستخدم الحالي.
     *
     * @throws BusinessRuleException
     */
    private function assertOwnership(Model $notification, ?User $user): void
    {
        if (
            ! $user
            || $notification->notifiable_id   != $user->id
            || $notification->notifiable_type !== get_class($user)
        ) {
            throw new BusinessRuleException('ليس لديك صلاحية تعديل هذا الإشعار', 403);
        }
    }
}
