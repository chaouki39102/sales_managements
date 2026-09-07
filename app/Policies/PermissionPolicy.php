<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * PermissionPolicy
 *
 * ══════════════════════════════════════════════════════════════════
 * G2 — مُحاذاة مفاتيح الصلاحيات مع South السنوات الـ 15.
 *
 *   viewAny / view  → view_roles   (قراءة الصلاحيات)
 *   create/update/delete/restore/forceDelete → manage_roles (إدارة الصلاحيات)
 *
 * المسارات: الكتابة خلف can:manage_roles (routes/api.php)، القراءة بدون قيد.
 * ══════════════════════════════════════════════════════════════════
 */
class PermissionPolicy
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