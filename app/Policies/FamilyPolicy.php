<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FamilyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_family');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_family');
    }

    public function create(User $user): bool
    {
        return $user->can('create_family');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_family');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_family');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_family');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_family');
    }
}