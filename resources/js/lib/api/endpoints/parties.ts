// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ════════════════════════════════════════════════════════════════════════════
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PartyListParams {
  search?:        string;
  party_type_id?: number;
  active?:        boolean;
  wilaya_id?:     number;
  per_page?:      number;
  page?:          number;
  include?:       string;
  [key: string]:  unknown;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const partiesApi = {
  list: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', p as Record<string, unknown>),

  clients: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', p as Record<string, unknown>),

  suppliers: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', p as Record<string, unknown>),

  show: (id: number) =>
    apiGet<Party>(`/parties/${id}`, {
      include: 'partyType,legalForm,defaultPriceLevel,wilaya,commune',
    }),

  create: (data: Partial<Party>) => apiPost<Party>('/parties', data),
  update: (id: number, data: Partial<Party>) => apiPut<Party>(`/parties/${id}`, data),
  delete: (id: number) => apiDelete(`/parties/${id}`),
} as const;

// ─── Query Hooks ──────────────────────────────────────────────────────────────
export function useParties(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn:         () => partiesApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClients(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', { ...params, _scope: 'customers' }),
    queryFn:         () => partiesApi.clients(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useSuppliers(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', { ...params, _scope: 'suppliers' }),
    queryFn:         () => partiesApi.suppliers(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:   () => partiesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── تصدير جميع الزبائن ────────────────────────────────────────────────────────
export async function fetchAllCustomers(search?: string, active?: boolean): Promise<Party[]> {
  const all: Party[] = [];
  let page = 1;
  let lastPage = 1;
  const perPage = 100;

  do {
    const res = await apiGet<PaginatedResponse<Party>>('/customers', {
        per_page: perPage,
        page,
        include: 'wilaya,commune,legalForm,defaultPriceLevel',
        ...(search ? { search } : {}),
        ...(active !== undefined ? { active } : {}),
    });
    const data = res?.data ?? [];
    all.push(...data);
    lastPage = res?.meta?.last_page ?? 1;
    page++;
  } while (page <= lastPage);

  return all;
}

export function useCashClient() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        ['parties', slug, 'cash-client'],
    queryFn:         () => apiGet<Party>('/cash-client'),
    enabled:         !!slug,
    staleTime:       Infinity,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug), refetchType: 'active' });
  };

  const invalidateOne = (party: Party) => {
    if (!slug) return;
    qc.setQueryData(tenantKeys.parties.detail(slug, party.id), party);
    invalidateAll();
  };

  return {
    create: useMutation({ mutationFn: (d: Partial<Party>) => partiesApi.create(d), onSuccess: invalidateAll }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) => partiesApi.update(id, data),
      onSuccess: invalidateOne,
    }),
    remove: useMutation({ mutationFn: (id: number) => partiesApi.delete(id), onSuccess: invalidateAll }),
  };
}
