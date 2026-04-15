<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class GenderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_gender');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_gender');
    }

    public function create(User $user): bool
    {
        return $user->can('create_gender');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_gender');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_gender');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_gender');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_gender');
    }
}