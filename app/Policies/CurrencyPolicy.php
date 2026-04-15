<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CurrencyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_currency');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_currency');
    }

    public function create(User $user): bool
    {
        return $user->can('create_currency');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_currency');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_currency');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_currency');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_currency');
    }
}