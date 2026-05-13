// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ════════════════════════════════════════════════════════════════════════════

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/client";
import { tenantKeys } from "../core/queryKeys";
import { useActiveSlug } from "../../store/appStore";
import type { Party, PaginatedResponse, ListParams } from "../core/types";

export const partiesApi = {
  list:      (params?: ListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', params),

  // ✅ endpoints مخصصة — أبسط وأوضح
  clients:   (params?: ListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', params),

  suppliers: (params?: ListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', params),

  show:   (id: number)                       => apiGet<Party>(`/parties/${id}`),
  create: (data: Partial<Party>)             => apiPost<Party>('/parties', data),
  update: (id: number, data: Partial<Party>) => apiPut<Party>(`/parties/${id}`, data),
  delete: (id: number)                       => apiDelete(`/parties/${id}`),
} as const;

function usePartyList(
    params?: ListParams & { partyType?: "client" | "supplier" | "all" },
) {
    const slug = useActiveSlug();
    const { partyType = "all", ...rest } = params ?? {};
    const endpoint =
        partyType === "client"
            ? partiesApi.clients
            : partyType === "supplier"
              ? partiesApi.suppliers
              : partiesApi.list;
    return useQuery({
        queryKey: tenantKeys.parties.list(slug ?? "", params),
        queryFn: () => endpoint(rest),
        enabled: !!slug,
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData,
    });
}

export const useParties = (params?: ListParams) => usePartyList(params);
export const useClients = (params?: ListParams) =>
    usePartyList({ ...params, partyType: "client" });
export const useSuppliers = (params?: ListParams) =>
    usePartyList({ ...params, partyType: "supplier" });

export function useParty(id: number | null | undefined) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.parties.detail(slug ?? "", id!),
        queryFn: () => partiesApi.show(id!),
        enabled: !!slug && !!id,
    });
}

export function usePartyMutations() {
    const slug = useActiveSlug();
    const qc = useQueryClient();
    const invalidate = () => {
        if (slug)
            qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) });
    };

    return {
        create: useMutation({
            mutationFn: partiesApi.create,
            onSuccess: invalidate,
        }),
        update: useMutation({
            mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
                partiesApi.update(id, data),
            onSuccess: invalidate,
        }),
        remove: useMutation({
            mutationFn: partiesApi.delete,
            onSuccess: invalidate,
        }),
    };
}
