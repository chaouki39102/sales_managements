// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts — النسخة الكاملة مع stats
// ════════════════════════════════════════════════════════════════════════════
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import apiClient, { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
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

export interface PartyStatRow {
  count:            number;
  total_ttc:        number;
  total_ht:         number;
  total_tva:        number;
  amount_paid:      number;
  amount_remaining: number;
  total_discount:   number;
}

export interface PartyStats {
  party:         Party;
  balance:       number;
  sales:         PartyStatRow;
  purchases:     PartyStatRow;
  payments:      { count: number; total: number };
  checks:        { count: number; total: number; pending_total: number; bounced_total: number };
  expenses:      { count: number; total: number; total_paid: number };
  last_document: {
    id: number; document_number: string; document_date: string;
    total_ttc: number; status: string; type_name: string;
  } | null;
  active_years:  { id: number; name: string; start_date: string; end_date: string }[];
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

  stats: (id: number, fiscalYearId?: number) =>
    apiGet<PartyStats>(`/parties/${id}/stats`,
      fiscalYearId ? { fiscal_year_id: fiscalYearId } : undefined,
    ),

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

// ✅ hook إحصاءات الطرف — يُشغَّل فقط عند فتح مودال التفاصيل
export function usePartyStats(id: number | null | undefined, fiscalYearId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'parties', id, 'stats', fiscalYearId],
    queryFn:   () => partiesApi.stats(id!, fiscalYearId),
    enabled:   !!slug && !!id,
    staleTime: 2 * 60_000,  // 2 دقيقة — تتغير بتغير المعاملات
  });
}

// ─── تصدير جميع الزبائن ────────────────────────────────────────────────────────
export async function fetchAllCustomers(search?: string, active?: boolean): Promise<Party[]> {
  const all: Party[] = [];
  let page = 1;
  let lastPage = 1;
  const perPage = 100;

  do {
    const res = await apiClient.get('/customers', {
      params: {
        per_page: perPage,
        page,
        include: 'wilaya,commune,legalForm,defaultPriceLevel',
        ...(search ? { search } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    const body = res.data;
    const data = body?.data ?? [];
    all.push(...data);
    lastPage = body?.meta?.last_page ?? 1;
    page++;
  } while (page <= lastPage);

  return all;
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
