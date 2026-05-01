<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NotificationService extends \App\Core\Services\BaseService
{
    protected string $model = Notification::class;
    protected string $resourceName = 'notification';

    public function getUnread()
    {
        $user = auth()->user();
        if (!$user) {
            return collect();
        }
        return $user->notifications()->unread()->get();
    }

    public function markAsRead(Model $notification): bool
    {
        $user = auth()->user();
        // التأكد أن هذا الإشعار يخص المستخدم الحالي
        if (
            $notification->notifiable_id != $user->id ||
            $notification->notifiable_type !== get_class($user)
        ) {
            throw new BusinessRuleException('لا يمكنك تعليم هذا الإشعار كمقروء', 403);
        }
        return $notification->markAsRead();
    }

    public function markAllAsRead(): void
    {
        $user = auth()->user();
        if ($user) {
            $user->notifications()->unread()->update(['read_at' => now()]);
        }
    }
}
