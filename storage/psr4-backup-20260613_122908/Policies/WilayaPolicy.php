<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WilayaPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_wilaya');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_wilaya');
    }

    public function create(User $user): bool
    {
        return $user->can('create_wilaya');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_wilaya');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_wilaya');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_wilaya');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_wilaya');
    }
}