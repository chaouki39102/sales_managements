<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CheckPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_check');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_check');
    }

    public function create(User $user): bool
    {
        return $user->can('create_check');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_check');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_check');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_check');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_check');
    }
}