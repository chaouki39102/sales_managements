// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/numberingSeries.ts
// Numbering Series CRUD + actions (tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';

import { useTenantQueryPaginated, useTenantMutation } from '@/hooks/useTenantQuery';
import type { NumberingSeries, PaginatedResponse, ListParams } from '../core/types';

// ─── API ─────────────────────────────────────────────────────────────────────
export const numberingSeriesApi = {
  list:   (params?: ListParams)                        => apiGet<PaginatedResponse<NumberingSeries>>('/numbering-series', params),
  show:   (id: number)                                 => apiGet<NumberingSeries>(`/numbering-series/${id}`),
  create: (data: Partial<NumberingSeries>)             => apiPost<NumberingSeries>('/numbering-series', data),
  update: (id: number, data: Partial<NumberingSeries>) => apiPut<NumberingSeries>(`/numbering-series/${id}`, data),
  delete: (id: number)                                 => apiDelete(`/numbering-series/${id}`),
  preview: (id: number)                                => apiGet<{ next_number: string }>(`/numbering-series/${id}/next-number`, { preview: true }),
  lock:   (id: number)                                 => apiPost(`/numbering-series/${id}/lock`),
  unlock: (id: number)                                 => apiPost(`/numbering-series/${id}/unlock`),
  sync:   (id: number)                                 => apiPost(`/numbering-series/${id}/sync`),
} as const;

// ─── Query hooks ─────────────────────────────────────────────────────────────
export function useNumberingSeriesList(params?: ListParams) {
  return useTenantQueryPaginated(
    (slug) => [slug, 'numbering-series'] as const,
    () => numberingSeriesApi.list(params),
  );
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────
export function useNumberingSeriesCreate(onSuccess?: () => void) {
  return useTenantMutation(
    (data: Partial<NumberingSeries>) => numberingSeriesApi.create(data),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}

export function useNumberingSeriesUpdate(onSuccess?: () => void) {
  return useTenantMutation(
    ({ id, data }: { id: number; data: Partial<NumberingSeries> }) => numberingSeriesApi.update(id, data),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}

export function useNumberingSeriesDelete(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => numberingSeriesApi.delete(id),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}

export function useNumberingSeriesLock(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => numberingSeriesApi.lock(id),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}

export function useNumberingSeriesUnlock(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => numberingSeriesApi.unlock(id),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}

export function useNumberingSeriesSync(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => numberingSeriesApi.sync(id),
    (slug) => [slug, 'numbering-series'] as const,
    { onSuccess },
  );
}
