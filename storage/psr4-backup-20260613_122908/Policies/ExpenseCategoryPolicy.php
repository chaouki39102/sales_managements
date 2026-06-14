<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpenseCategoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense_category');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense_category');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense_category');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense_category');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense_category');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense_category');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense_category');
    }
}