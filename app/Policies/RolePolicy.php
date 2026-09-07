<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * RolePolicy
 *
 * ══════════════════════════════════════════════════════════════════
 * G2 — مُحاذاة مفاتيح الصلاحيات مع South السنوات الـ 15.
 *
 *   viewAny / view  → view_roles   (قراءة الأدوار)
 *   create/update/delete/restore/forceDelete → manage_roles (إدارة الأدوار)
 *
 * المسارات: الكتابة خلف can:manage_roles (routes/api.php)، القراءة بدون قيد.
 * القاعدة الفعلية على مستوى الـ Gate + Gate::before للمالك/سوبر-مين.
 * ══════════════════════════════════════════════════════════════════
 */
class RolePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_roles');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_roles');
    }

    public function create(User $user): bool
    {
        return $user->can('manage_roles');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('manage_roles');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('manage_roles');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('manage_roles');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('manage_roles');
    }
}