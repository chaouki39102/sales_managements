// lib/api/endpoints/roles.ts
// ════════════════════════════════════════════════════════════════════════════
// Roles & Permissions API — قراءة وكتابة
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/client";
import { tenantKeys } from "../core/queryKeys";
import { useActiveSlug } from "../../store/appStore";
import type { Permission, Role, PaginatedResponse } from "../core/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoleWithPermissions extends Role {
    permissions: Permission[];
    users_count?: number;
}

export interface PermissionsGrouped {
    [group: string]: Permission[];
}

export interface CreateRolePayload {
    name: string;
    display_name?: string;
    description?: string;
    guard_name?: string;
    permission_ids?: number[];
}

export interface UpdateRolePayload {
    display_name?: string;
    description?: string;
    permission_ids?: number[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export const rolesApi = {
    /** جلب كل الأدوار مع صلاحياتها */
    list: () =>
        apiGet<PaginatedResponse<RoleWithPermissions>>("/roles", {
            per_page: 100,
            sort: "name",
        }).then((r) => r.data),

    /** جلب دور واحد */
    show: (id: number) => apiGet<RoleWithPermissions>(`/roles/${id}`),

    /** إنشاء دور */
    create: (data: CreateRolePayload) =>
        apiPost<RoleWithPermissions>("/roles", data),

    /** تحديث دور */
    update: (id: number, data: UpdateRolePayload) =>
        apiPut<RoleWithPermissions>(`/roles/${id}`, data),

    /** حذف دور */
    delete: (id: number) => apiDelete(`/roles/${id}`),
} as const;

export const permissionsApi = {
    /** جلب كل الصلاحيات */
    list: () =>
        apiGet<PaginatedResponse<Permission>>("/permissions", { per_page: 500, sort: "group" }).then((r) => r.data),

    /** جلب الصلاحيات مجمّعة حسب المجموعة */
    byGroup: (group?: string) =>
        apiGet<PermissionsGrouped | Permission[]>(
            "/permissions/by-group",
            group ? { group } : undefined,
        ),

    /** صلاحيات المستخدم الحالي */
    myPermissions: () => apiGet<string[]>("/me/permissions"),

    /** صلاحيات المستخدم الحالي مع الأدوار */
    myRoles: () =>
        apiGet<{ roles: Role[]; permissions: string[] }>("/me/roles"),
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────

// ✅ مدمجة في tenantKeys من queryKeys.ts — لكن نُصدّرها هنا للراحة
export const roleKeys = {
    all: (slug: string) => [...tenantKeys.lookups.roles(slug)] as const,
    list: (slug: string) =>
        [...tenantKeys.lookups.roles(slug), "list"] as const,
    detail: (slug: string, id: number) =>
        [...tenantKeys.lookups.roles(slug), id] as const,
    permissions: (slug: string) =>
        [...tenantKeys.lookups.roles(slug), "permissions"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * ✅ جلب كل الأدوار مع صلاحياتها
 * يحل مشكلة التكرار لأن الباكاند يُضيف ->distinct()
 */
export function useRoles() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: roleKeys.list(slug),
        queryFn: () => rolesApi.list(),
        enabled: !!slug,
        staleTime: 5 * 60_000,
        select: (data) => {
            const items = Array.isArray(data) ? data : [];
            const seen = new Map<string, typeof items[0]>();
            for (const role of items) {
                if (!seen.has(role.name)) {
                    seen.set(role.name, role);
                }
            }
            return Array.from(seen.values());
        },
    });
}

/**
 * جلب دور واحد
 */
export function useRole(id: number) {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: roleKeys.detail(slug, id),
        queryFn: () => rolesApi.show(id),
        enabled: !!slug && !!id,
        staleTime: 5 * 60_000,
    });
}

/**
 * ✅ جلب الصلاحيات مجمّعة حسب المجموعة
 */
export function usePermissionsGrouped() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.permissions(slug), "grouped"],
        queryFn: () => permissionsApi.byGroup(),
        enabled: !!slug,
        staleTime: 10 * 60_000, // صلاحيات لا تتغير كثيراً
        select: (data): PermissionsGrouped => {
            // data قد تكون grouped dict أو array مسطّح
            if (Array.isArray(data)) {
                // حوّل array إلى grouped
                return (data as Permission[]).reduce<PermissionsGrouped>(
                    (acc, p) => {
                        const group = p.group ?? "أخرى";
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(p);
                        return acc;
                    },
                    {},
                );
            }
            return data as PermissionsGrouped;
        },
    });
}

/**
 * ✅ صلاحيات المستخدم الحالي
 */
export function useMyPermissions() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.all(slug), "my-permissions"],
        queryFn: permissionsApi.myPermissions,
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/**
 * ✅ أدوار وصلاحيات المستخدم الحالي معاً
 */
export function useMyRolesAndPermissions() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.all(slug), "my-roles"],
        queryFn: permissionsApi.myRoles,
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: rolesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
        },
    });
}

export function useUpdateRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateRolePayload }) =>
            rolesApi.update(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
            qc.invalidateQueries({ queryKey: roleKeys.detail(slug, id) });
        },
    });
}

export function useDeleteRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: rolesApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
        },
    });
}
