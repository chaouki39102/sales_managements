// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/checks.ts
// الشيكات — وحدة مستقلة عن الدفعات
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { useActiveSlug } from '../../store/appStore';
import type { Check, PaginatedResponse, ListParams, CheckStatus } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckCreateInput {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  notes?:                 string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const checksApi = {
  list:   (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks', params),

  show:   (id: number) =>
    apiGet<Check>(`/checks/${id}`),

  create: (data: CheckCreateInput) =>
    apiPost<Check>('/checks', data),

  update: (id: number, data: Partial<CheckCreateInput>) =>
    apiPut<Check>(`/checks/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/checks/${id}`),

  markCleared: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-cleared`),

  markBounced: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-bounced`),

  pending: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/pending', params),

  overdue: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/overdue', params),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useChecks(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'checks', 'list', params],
    queryFn:         () => checksApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCheckMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
    }
  };

  return {
    create:      useMutation({ mutationFn: checksApi.create,      onSuccess: invalidate }),
    update:      useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CheckCreateInput> }) => checksApi.update(id, data), onSuccess: invalidate }),
    remove:      useMutation({ mutationFn: checksApi.delete,      onSuccess: invalidate }),
    markCleared: useMutation({ mutationFn: checksApi.markCleared, onSuccess: invalidate }),
    markBounced: useMutation({ mutationFn: checksApi.markBounced, onSuccess: invalidate }),
  };
}
