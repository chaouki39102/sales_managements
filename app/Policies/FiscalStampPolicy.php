<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FiscalStampPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_fiscal_stamp');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_fiscal_stamp');
    }

    public function create(User $user): bool
    {
        return $user->can('create_fiscal_stamp');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_fiscal_stamp');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_fiscal_stamp');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_fiscal_stamp');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_fiscal_stamp');
    }
}