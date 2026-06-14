<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

class ProductVariantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function create(User $user, Product $product): bool
    {
        return $user->hasAccessToCompany($product->company_id);
    }

    public function update(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function delete(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }
}
