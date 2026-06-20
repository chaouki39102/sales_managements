<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalanceTreasuryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool { return $user->can('manage_opening_balances'); }
    public function view(User $user, $model): bool { return $user->can('manage_opening_balances'); }
    public function create(User $user): bool { return $user->can('manage_opening_balances'); }
    public function update(User $user, $model): bool { return $user->can('manage_opening_balances'); }
    public function delete(User $user, $model): bool { return $user->can('manage_opening_balances'); }
}
