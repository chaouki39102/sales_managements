<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WarehousePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_warehouse');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_warehouse');
    }

    public function create(User $user): bool
    {
        return $user->can('create_warehouse');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_warehouse');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_warehouse');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_warehouse');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_warehouse');
    }
}