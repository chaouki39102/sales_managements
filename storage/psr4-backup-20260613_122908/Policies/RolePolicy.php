<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RolePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_role');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_role');
    }

    public function create(User $user): bool
    {
        return $user->can('create_role');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_role');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_role');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_role');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_role');
    }
}