<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product');
    }
}