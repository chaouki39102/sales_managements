<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BrandPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_brand');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_brand');
    }

    public function create(User $user): bool
    {
        return $user->can('create_brand');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_brand');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_brand');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_brand');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_brand');
    }
}