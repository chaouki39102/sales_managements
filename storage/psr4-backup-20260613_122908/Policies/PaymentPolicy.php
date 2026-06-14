<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment');
    }
}