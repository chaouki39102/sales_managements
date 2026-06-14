<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommunePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commune');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commune');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commune');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commune');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commune');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commune');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commune');
    }
}