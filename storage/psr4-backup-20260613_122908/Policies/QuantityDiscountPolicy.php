<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class QuantityDiscountPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_quantity_discount');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_quantity_discount');
    }

    public function create(User $user): bool
    {
        return $user->can('create_quantity_discount');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_quantity_discount');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_quantity_discount');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_quantity_discount');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_quantity_discount');
    }
}