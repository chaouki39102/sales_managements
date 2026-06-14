<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalanceStockPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_opening_balance_stock');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_opening_balance_stock');
    }

    public function create(User $user): bool
    {
        return $user->can('create_opening_balance_stock');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_opening_balance_stock');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_opening_balance_stock');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_opening_balance_stock');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_opening_balance_stock');
    }
}