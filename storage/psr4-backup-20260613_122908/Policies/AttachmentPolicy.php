<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AttachmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_attachment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_attachment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_attachment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_attachment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_attachment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_attachment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_attachment');
    }
}