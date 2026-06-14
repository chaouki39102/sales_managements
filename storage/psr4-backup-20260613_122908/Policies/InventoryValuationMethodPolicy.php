<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryValuationMethodPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_inventory_valuation_method');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_inventory_valuation_method');
    }

    public function create(User $user): bool
    {
        return $user->can('create_inventory_valuation_method');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_inventory_valuation_method');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_inventory_valuation_method');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_inventory_valuation_method');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_inventory_valuation_method');
    }
}