<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AuditPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_audit');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_audit');
    }

    public function create(User $user): bool
    {
        return $user->can('create_audit');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_audit');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_audit');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_audit');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_audit');
    }
}