<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TreasuryAccountPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_treasury_account');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_treasury_account');
    }

    public function create(User $user): bool
    {
        return $user->can('create_treasury_account');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_treasury_account');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_treasury_account');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_treasury_account');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_treasury_account');
    }
}