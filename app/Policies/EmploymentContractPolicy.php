<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmploymentContractPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_employment_contract');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_employment_contract');
    }

    public function create(User $user): bool
    {
        return $user->can('create_employment_contract');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_employment_contract');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_employment_contract');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_employment_contract');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_employment_contract');
    }
}