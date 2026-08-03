import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../core/client";
import { companyKeys } from "../core/queryKeys";
import type { Company, CompanyMember } from "../core/types";

// ─── API functions ─────────────────────────────────────────────────────────────

export const companiesApi = {
    mine: () => apiGet<Company[]>("/companies"),

    current: () =>
        apiGet<Company>("/companies/current").catch((err) => {
            if (err?.status === 404) return null as unknown as Company;
            throw err;
        }),

    show: (slug: string) => apiGet<Company>(`/companies/${slug}`),
    create: (data: Partial<Company>) => apiPost<Company>("/companies", data),
    update: (slug: string, data: Partial<Company>) =>
        apiPut<Company>(`/companies/${slug}`, data),

    portalQr: (slug: string, url: string) =>
        apiGet<{ url: string; data_uri: string }>(
            `/companies/${slug}/portal-qr`,
            { url },
        ),

    switch: (companyId: number) =>
        apiPost<{ user: { company_id: number } }>("/companies/switch", {
            company_id: companyId,
        }),

    members: (slug: string) =>
        apiGet<CompanyMember[]>(`/companies/${slug}/members`).then(
            (members) => {
                if (!Array.isArray(members)) return [];
                return members
                    .filter((m) => m && typeof m === "object")
                    .map((m: any) => ({
                        id: m.id ?? m.user_id ?? m.pivot?.id,
                        user_id: m.user_id ?? m.pivot?.user_id,
                        name: m.name ?? m.user?.name ?? "N/A",
                        email: m.email ?? m.user?.email ?? "N/A",
                        role: m.role ?? m.pivot?.role ?? "member",
                        active: m.active ?? m.pivot?.active ?? true,
                        created_at: m.created_at ?? new Date().toISOString(),
                    }));
            },
        ),

    addMember: (slug: string, userId: number | string, role?: string) =>
        apiPost(`/companies/${slug}/members`, {
            user_id: typeof userId === "string" ? parseInt(userId, 10) : userId,
            role: role || "member",
        }),

    removeMember: (slug: string, userId: number) =>
        apiDelete(`/companies/${slug}/members/${userId}`),
    changeMemberRole: (slug: string, userId: number, role: string) =>
        apiPatch(`/companies/${slug}/members/${userId}/role`, { role }),
    activateMember: (slug: string, userId: number) =>
        apiPatch(`/companies/${slug}/members/${userId}/activate`, {}),
    deactivateMember: (slug: string, userId: number) =>
        apiPatch(`/companies/${slug}/members/${userId}/deactivate`, {}),
    transferOwnership: (slug: string, userId: number) =>
        apiPost(`/companies/${slug}/transfer-ownership`, { user_id: userId }),
    remove: (slug: string) => apiDelete(`/companies/${slug}`),
} as const;

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useMyCompanies() {
    return useQuery({
        queryKey: companyKeys.mine,
        queryFn: companiesApi.mine,
        staleTime: 5 * 60_000,
    });
}

export function useCurrentCompany(enabled = true) {
  return useQuery({
    queryKey:  companyKeys.current,
    queryFn:   companiesApi.current,
    enabled,
    staleTime: 5 * 60_000,
    retry:     false,  // ✅ لا تُعيد المحاولة — 404 متوقع
  });
}

// ✅ onError مُزال من useQuery — مُعاد كـ useEffect
export function useCompanyMembers(slug: string) {
    const query = useQuery({
        queryKey: companyKeys.members(slug),
        queryFn: () => companiesApi.members(slug),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        retry: 1,
    });

    useEffect(() => {
        if (query.error) {
            const err = query.error as any;
            console.error("[Members Error]", {
                status: err.status,
                message: err.message,
                slug,
            });
        }
    }, [query.error, slug]);

    return query;
}

export function useSwitchCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: companiesApi.switch,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: companyKeys.all });
            qc.invalidateQueries({ queryKey: companyKeys.current });
        },
    });
}

export function useCreateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: companiesApi.create,
        onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.mine }),
    });
}

export function useUpdateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            slug,
            data,
        }: {
            slug: string;
            data: Partial<Company>;
        }) => companiesApi.update(slug, data),
        onSuccess: (updatedCompany) => {
            // ✅ حدّث الـ cache مباشرة بدل invalidate فقط
            // هذا يمنع loading state وسط العمل
            if (updatedCompany) {
                qc.setQueryData(companyKeys.current, updatedCompany);
            }
            // ✅ أبطل mine لتحديث القائمة
            qc.invalidateQueries({ queryKey: companyKeys.mine });
        },
    });
}

export function useDeactivateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (slug: string) => companiesApi.remove(slug),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: companyKeys.all });
        },
    });
}

export function useCompanyMemberMutations(slug: string) {
    const qc = useQueryClient();
    const inv = () =>
        qc.invalidateQueries({ queryKey: companyKeys.members(slug) });

    return {
        add: useMutation({
            mutationFn: ({
                userId,
                role,
            }: {
                userId: number | string;
                role?: string;
            }) =>
                companiesApi.addMember(
                    slug,
                    typeof userId === "string" ? parseInt(userId, 10) : userId,
                    role,
                ),
            onSuccess: inv,
            onError: (
                err: any, // ✅ onError صحيح في useMutation
            ) =>
                console.error("[Add Member Error]", {
                    status: err.status,
                    message: err.message,
                    errors: err.errors,
                }),
        }),

        remove: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.removeMember(slug, userId),
            onSuccess: inv,
        }),

        changeRole: useMutation({
            mutationFn: ({ userId, role }: { userId: number; role: string }) =>
                companiesApi.changeMemberRole(slug, userId, role),
            onSuccess: inv,
        }),

        activate: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.activateMember(slug, userId),
            onSuccess: inv,
        }),

        deactivate: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.deactivateMember(slug, userId),
            onSuccess: inv,
        }),

        transferOwnership: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.transferOwnership(slug, userId),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: companyKeys.mine });
                qc.invalidateQueries({ queryKey: companyKeys.current });
            },
        }),
    };
}
