// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documents.ts
// Commercial Documents API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { CommercialDocument, PaginatedResponse, ListParams } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  list:     (params?: ListParams)              => apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),
  byType:   (typeCode: string, params?: ListParams) => apiGet<PaginatedResponse<CommercialDocument>>('/documents', { ...params, type: typeCode }),
  show:     (id: number)                       => apiGet<CommercialDocument>(`/documents/${id}`),
  create:   (data: Partial<CommercialDocument>)=> apiPost<CommercialDocument>('/documents', data),
  update:   (id: number, data: Partial<CommercialDocument>) =>
                                                  apiPut<CommercialDocument>(`/documents/${id}`, data),
  delete:   (id: number)                       => apiDelete(`/documents/${id}`),
  validate: (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/validate`),
  lock:     (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/lock`),
  unlock:   (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/unlock`),
  cancel:   (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/cancel`),
  qrcode:   (id: number)                       => apiGet<{ url: string }>(`/documents/${id}/qrcode`),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDocuments(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentsByType(typeCode: string, params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.byType(slug ?? '', typeCode, params),
    queryFn:         () => documentsApi.byType(typeCode, params),
    enabled:         !!slug && !!typeCode,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:  () => documentsApi.show(id!),
    enabled:  !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useDocumentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const create   = useMutation({ mutationFn: documentsApi.create,                                                   onSuccess: invalidate });
  const update   = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CommercialDocument> }) => documentsApi.update(id, data), onSuccess: invalidate });
  const remove   = useMutation({ mutationFn: documentsApi.delete,                                                   onSuccess: invalidate });
  const validate = useMutation({ mutationFn: documentsApi.validate,                                                  onSuccess: invalidate });
  const lock     = useMutation({ mutationFn: documentsApi.lock,                                                      onSuccess: invalidate });
  const unlock   = useMutation({ mutationFn: documentsApi.unlock,                                                    onSuccess: invalidate });
  const cancel   = useMutation({ mutationFn: documentsApi.cancel,                                                    onSuccess: invalidate });

  return { create, update, remove, validate, lock, unlock, cancel };
}
