<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PermissionPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_permission');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_permission');
    }

    public function create(User $user): bool
    {
        return $user->can('create_permission');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_permission');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_permission');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_permission');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_permission');
    }
}