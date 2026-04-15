<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NotificationService extends \App\Core\Services\BaseService
{
    protected string $model = Notification::class;
    protected string $resourceName = 'notification';

    public function getUnread()
    {
        return $this->model::unread()->get();
    }

    public function markAsRead(Model $notification): bool
    {
        return $notification->markAsRead();
    }

    public function markAllAsRead(): void
    {
        $this->model::unread()->update(['read_at' => now()]);
    }
}