// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documentTypes.ts
// Document Types CRUD (tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import type { DocumentType } from '../core/types';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DocumentBaseOperation {
  id: number;
  name: string;
  label: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export const documentTypesApi = {
  list:   (params?: Record<string, unknown>)         => apiGet<DocumentType[]>('/document-types', params),
  show:   (id: number)                                => apiGet<DocumentType>(`/document-types/${id}`),
  create: (data: Partial<DocumentType>)               => apiPost<DocumentType>('/document-types', data),
  update: (id: number, data: Partial<DocumentType>)   => apiPut<DocumentType>(`/document-types/${id}`, data),
  delete: (id: number)                                => apiDelete(`/document-types/${id}`),
  listBaseOperations: ()                              => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
  countDocumentsForType: (typeId: number)             => apiGet<{ meta: { total: number } }>('/commercial-documents', { document_type_id: typeId, per_page: 1 }),
} as const;

// ─── Query hooks ─────────────────────────────────────────────────────────────
export function useDocumentTypesList(filter?: string) {
  return useTenantQuery<DocumentType[]>(
    (slug) => tenantKeys.lookups.documentTypes(slug),
    () => documentTypesApi.list({ filter: filter || undefined }),
  );
}

export function useDocumentBaseOpsList() {
  return useTenantQuery<DocumentBaseOperation[]>(
    (slug) => tenantKeys.lookups.documentBaseOps(slug),
    () => documentTypesApi.listBaseOperations(),
    { staleTime: 10 * 60_000 },
  );
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────
export function useDocumentTypeCreate(onSuccess?: () => void) {
  return useTenantMutation(
    (data: Partial<DocumentType>) => documentTypesApi.create(data),
    (slug) => tenantKeys.lookups.documentTypes(slug),
    { onSuccess },
  );
}

export function useDocumentTypeUpdate(onSuccess?: () => void) {
  return useTenantMutation(
    ({ id, data }: { id: number; data: Partial<DocumentType> }) => documentTypesApi.update(id, data),
    (slug) => tenantKeys.lookups.documentTypes(slug),
    { onSuccess },
  );
}

export function useDocumentTypeDelete(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => documentTypesApi.delete(id),
    (slug) => tenantKeys.lookups.documentTypes(slug),
    { onSuccess },
  );
}
