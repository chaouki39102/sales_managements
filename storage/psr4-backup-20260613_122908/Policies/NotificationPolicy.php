<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NotificationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_notification');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_notification');
    }

    public function create(User $user): bool
    {
        return $user->can('create_notification');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_notification');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_notification');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_notification');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_notification');
    }
}