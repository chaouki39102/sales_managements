<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UnitPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_unit');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_unit');
    }

    public function create(User $user): bool
    {
        return $user->can('create_unit');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_unit');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_unit');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_unit');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_unit');
    }
}