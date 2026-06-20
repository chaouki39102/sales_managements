import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';

export interface ChainNode {
  id:               number;
  document_number:  string;
  document_type:    string;
  type_name:        string;
  status:           string;
  status_label:     string;
  document_date:    string;
  net_to_pay:       number;
  is_cancellation:  boolean;
  children?:        ChainNode[];
}

export interface DocumentChain {
  ancestors:   ChainNode[];
  current:     ChainNode;
  descendants: ChainNode[];
}

export function useDocumentChain(documentId: number | null | undefined) {
  const slug = useActiveSlug();

  return useQuery<DocumentChain | null>({
    queryKey: [slug, 'document-chain', documentId],
    queryFn: () =>
      documentId
        ? apiGet<DocumentChain>(`/documents/${documentId}/chain`)
        : null,
    enabled: !!slug && !!documentId,
    staleTime: 60_000,
  });
}

// ─── Conversion mutation ──────────────────────────────────────────────────────

export interface ConversionPayload {
  documentId:      number;
  targetTypeCode:  string;
  includeLineIds?: number[];
}

export function useConvertDocument() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, targetTypeCode, includeLineIds }: ConversionPayload) =>
      apiPost(`/documents/${documentId}/convert`, {
        target_type_code: targetTypeCode,
        include_line_ids: includeLineIds,
      }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}

// ─── Return mutation ──────────────────────────────────────────────────────────

export interface ReturnPayload {
  documentId: number;
  reason:     string;
  lines:      Array<{ line_id: number; quantity: number }>;
}

export function useCreateReturn() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason, lines }: ReturnPayload) =>
      apiPost(`/documents/${documentId}/return`, { reason, lines }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}
