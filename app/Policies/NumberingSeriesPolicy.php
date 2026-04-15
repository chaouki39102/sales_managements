<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NumberingSeriesPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_numbering_series');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_numbering_series');
    }

    public function create(User $user): bool
    {
        return $user->can('create_numbering_series');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_numbering_series');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_numbering_series');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_numbering_series');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_numbering_series');
    }
}