<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductVariantPricePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_variant_price');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_variant_price');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_variant_price');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_variant_price');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_variant_price');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_variant_price');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_variant_price');
    }
}