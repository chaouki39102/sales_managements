<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentModePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment_mode');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment_mode');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment_mode');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment_mode');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment_mode');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment_mode');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment_mode');
    }
}