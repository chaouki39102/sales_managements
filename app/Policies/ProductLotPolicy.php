<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductLotPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_lot');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_lot');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_lot');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_lot');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_lot');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_lot');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_lot');
    }
}