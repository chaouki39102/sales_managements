<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\Log;

class FiscalYearPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function create(User $user): bool
    {
        Log::info('FiscalYearPolicy::create', [
            'user_id' => $user->id,
            'roles' => $user->getRoleNames(),
            'can_manage' => $user->can('manage_fiscal_year'),
        ]);
        return $user->can('manage_fiscal_year');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }
}
