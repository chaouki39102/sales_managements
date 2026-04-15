<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LegalFormPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_legal_form');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_legal_form');
    }

    public function create(User $user): bool
    {
        return $user->can('create_legal_form');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_legal_form');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_legal_form');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_legal_form');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_legal_form');
    }
}