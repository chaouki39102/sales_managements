// resources/js/pages/users/hooks/useUsersPageData.ts — استعلامات وطفرات صفحة المستخدمين
import { useRoles } from "@/lib/api/endpoints/roles";
import { usersApi, usePermissions } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantQuery, useTenantMutation } from "@/hooks/useTenantQuery";
import { useNotification } from "@/hooks/useNotification";
import type { User } from "../types";

export function useUsersPageData(search: string) {
    const notify = useNotification();

    // ─── Queries ───────────────────────────────────
    const {
        data: users = [],
        isLoading: usersLoading,
    } = useTenantQuery<User[]>(
        (slug) => tenantKeys.users.list(slug, { search: search || undefined, per_page: 100, include: 'roles,permissions' }),
        () => usersApi.list({ search: search || undefined, per_page: 100, include: 'roles,permissions' } as any).then(
            (res: any) => res?.data ?? [],
        ),
        { staleTime: 30_000 },
    );

    const { data: roles = [], isLoading: rolesLoading } = useRoles();

    const { data: permsData, isLoading: permsLoading } = usePermissions();
    const permissions = Array.isArray(permsData) ? permsData : [];

    // ─── Mutations ─────────────────────────────────
    const deleteUser = useTenantMutation(
        (id: number) => usersApi.delete(id),
        (slug) => tenantKeys.users.all(slug),
        {
            onSuccess: () => notify.success('تم الحذف'),
        },
    );

    // تعيين دور المستخدم داخل الشركة
    const assignRole = useTenantMutation(
        ({ userId, role }: { userId: number; role: string }) =>
            usersApi.assignRole(userId, role),
        (slug) => tenantKeys.users.all(slug),
        {
            onSuccess: () => notify.success('تم تحديث الدور'),
            onError: (err: any) =>
                notify.error(err?.response?.data?.message ?? 'تعذر تحديث الدور'),
        },
    );

    return {
        users,
        usersLoading,
        roles,
        rolesLoading,
        permissions,
        permsLoading,
        deleteUser,
        assignRole,
    };
}

export type UsersPageData = ReturnType<typeof useUsersPageData>;
