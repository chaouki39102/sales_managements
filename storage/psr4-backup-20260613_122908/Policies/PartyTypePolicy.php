<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartyTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_party_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_party_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_party_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_party_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_party_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_party_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_party_type');
    }
}