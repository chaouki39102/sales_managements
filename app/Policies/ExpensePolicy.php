<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense');
    }
}