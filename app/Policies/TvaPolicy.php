<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TvaPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_tva');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_tva');
    }

    public function create(User $user): bool
    {
        return $user->can('create_tva');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_tva');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_tva');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_tva');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_tva');
    }
}