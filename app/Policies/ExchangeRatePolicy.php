<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExchangeRatePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_exchange_rate');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_exchange_rate');
    }

    public function create(User $user): bool
    {
        return $user->can('create_exchange_rate');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_exchange_rate');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_exchange_rate');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_exchange_rate');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_exchange_rate');
    }
}