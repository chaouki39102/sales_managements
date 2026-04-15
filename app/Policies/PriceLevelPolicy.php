<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PriceLevelPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_price_level');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_price_level');
    }

    public function create(User $user): bool
    {
        return $user->can('create_price_level');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_price_level');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_price_level');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_price_level');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_price_level');
    }
}