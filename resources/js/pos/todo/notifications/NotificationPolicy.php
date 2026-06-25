<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * NotificationPolicy
 *
 * ⚠️  Multi-tenancy:
 *  كل policy method تتحقق من شرطين:
 *   1. $user->id    === $notification->notifiable_id   (عزل المستخدم)
 *   2. $companyId   === $notification->company_id      (عزل الـ tenant)
 */
class NotificationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_notification');
    }

    public function view(User $user, Notification $notification): bool
    {
        return $user->can('view_notification')
            && $this->isOwnerInCurrentCompany($user, $notification);
    }

    public function update(User $user, Notification $notification): bool
    {
        return $user->can('update_notification')
            && $this->isOwnerInCurrentCompany($user, $notification);
    }

    public function delete(User $user, Notification $notification): bool
    {
        return $user->can('delete_notification')
            && $this->isOwnerInCurrentCompany($user, $notification);
    }

    // تُستخدم عند تمرير الـ Class (مثل markAllAsRead)
    public function create(User $user): bool
    {
        return $user->can('create_notification');
    }

    public function restore(User $user, Notification $notification): bool
    {
        return $user->can('restore_notification')
            && $this->isOwnerInCurrentCompany($user, $notification);
    }

    public function forceDelete(User $user, Notification $notification): bool
    {
        return $user->can('force_delete_notification')
            && $this->isOwnerInCurrentCompany($user, $notification);
    }

    // ── Private ────────────────────────────────────────────────

    /**
     * التحقق المزدوج: المستخدم مالك الإشعار + نفس الشركة النشطة.
     */
    private function isOwnerInCurrentCompany(User $user, Notification $notification): bool
    {
        $currentCompanyId = $user->current_company_id ?? $user->company_id;

        return $notification->notifiable_id   == $user->id
            && $notification->notifiable_type === get_class($user)
            && $notification->company_id      == $currentCompanyId;
    }
}
