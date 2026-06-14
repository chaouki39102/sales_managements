<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_setting');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_setting');
    }

    public function create(User $user): bool
    {
        return $user->can('create_setting');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_setting');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_setting');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_setting');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_setting');
    }
}