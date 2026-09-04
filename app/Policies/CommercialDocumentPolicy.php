<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commercial_document');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commercial_document');
    }

    public function create(User $user): bool
    {
        // لا توجد صلاحية «create_commercial_document» — الإنشاء يصنّف بيعاً أو شراءً.
        return $user->can('create_sales_document') || $user->can('create_purchase_document');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commercial_document');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commercial_document');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commercial_document');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commercial_document');
    }
}