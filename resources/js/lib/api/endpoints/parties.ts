// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ✅ مصحح: party_type_id صحيح + include relations + balance
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse, ListParams } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartyListParams extends ListParams {
  party_type_id?: number;
  active?:        boolean;
  wilaya_id?:     number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const partiesApi = {
  list: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', params),

  // ✅ /customers و /suppliers مسارات مختصرة في api.php
  clients: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', params),

  suppliers: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', params),

  show: (id: number) =>
    apiGet<Party>(`/parties/${id}`, {
      include: 'partyType,defaultPriceLevel,wilaya,commune',
    }),

  create: (data: Partial<Party>) =>
    apiPost<Party>('/parties', data),

  update: (id: number, data: Partial<Party>) =>
    apiPut<Party>(`/parties/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/parties/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePartyList(params?: PartyListParams & { _type?: 'client' | 'supplier' | 'all' }) {
  const slug = useActiveSlug();
  const { _type = 'all', ...rest } = params ?? {};

  const queryFn =
    _type === 'client'   ? () => partiesApi.clients(rest) :
    _type === 'supplier' ? () => partiesApi.suppliers(rest) :
                           () => partiesApi.list(rest);

  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn,
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export const useParties   = (params?: PartyListParams) =>
  usePartyList(params);

export const useClients   = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'client' });

export const useSuppliers = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'supplier' });

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:   () => partiesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({
        queryKey:    tenantKeys.parties.all(slug),
        refetchType: 'active', // يُعيد الجلب فوراً للـ queries المعروضة حالياً
      });
    }
  };

  const invalidateOne = (party: Party) => {
    if (slug) {
      qc.setQueryData(tenantKeys.parties.detail(slug, party.id), party);
      qc.invalidateQueries({
        queryKey:    tenantKeys.parties.all(slug),
        refetchType: 'active',
      });
    }
  };

  return {
    create: useMutation({ mutationFn: partiesApi.create,  onSuccess: invalidate    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
        partiesApi.update(id, data),
      onSuccess: invalidateOne,
    }),
    remove: useMutation({ mutationFn: partiesApi.delete,  onSuccess: invalidate    }),
  };
}
