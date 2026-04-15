<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class StockMovementPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_stock_movement');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_stock_movement');
    }

    public function create(User $user): bool
    {
        return $user->can('create_stock_movement');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_stock_movement');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_stock_movement');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_stock_movement');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_stock_movement');
    }
}