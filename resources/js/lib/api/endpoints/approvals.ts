// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/approvals.ts
// سير عمل الموافقة على المستندات
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { CommercialDocument } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalCheck {
  requires_approval: boolean;
  threshold: {
    id:          number;
    min_amount:  number;
    max_amount:  number | null;
    role_id:     number | null;
  } | null;
}

export interface ApprovalThreshold {
  id:               number;
  company_id:       number;
  document_type_id: number;
  min_amount:       number;
  max_amount:       number | null;
  requires_approval: boolean;
  role_id:          number | null;
  notes:            string | null;
  is_active:        boolean;
  created_by:       number;
  created_at:       string;
  updated_at:       string;
  // Relations
  document_type?:   { id: number; name: string; code: string };
  role?:            { id: number; name: string };
}

export interface ApprovalThresholdInput {
  document_type_id: number;
  min_amount:       number;
  max_amount?:      number | null;
  role_id?:         number | null;
  notes?:           string | null;
  is_active?:       boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const approvalsApi = {
  check: (documentId: number) =>
    apiGet<ApprovalCheck>(`/approvals/check/${documentId}`),

  checkBatch: (documentIds: number[]) =>
    apiPost<Record<number, ApprovalCheck>>('/approvals/check-batch', { document_ids: documentIds }),

  submit: (documentId: number) =>
    apiPost<{ message: string; document: CommercialDocument }>(`/approvals/submit/${documentId}`),

  approve: (documentId: number, reason?: string) =>
    apiPost<{ message: string; document: CommercialDocument }>(`/approvals/${documentId}/approve`, { reason }),

  reject: (documentId: number, reason: string) =>
    apiPost<{ message: string; document: CommercialDocument }>(`/approvals/${documentId}/reject`, { reason }),

  thresholds: () =>
    apiGet<ApprovalThreshold[]>('/approvals/thresholds'),

  storeThreshold: (data: ApprovalThresholdInput) =>
    apiPost<ApprovalThreshold>('/approvals/thresholds', data),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useApprovalCheck(documentId: number | null | undefined) {
  const slug = useActiveSlug();
  const { data: thresholds } = useApprovalThresholds();
  const noThresholds = thresholds !== undefined && thresholds.length === 0;
  return useQuery({
    queryKey:  [slug, 'approvals', 'check', documentId],
    queryFn:   () => approvalsApi.check(documentId!),
    enabled:   !!slug && !!documentId && !noThresholds,
    staleTime: 30_000,
  });
}

export function useApprovalCheckBatch(documentIds: number[]) {
  const slug = useActiveSlug();
  const { data: thresholds } = useApprovalThresholds();
  const noThresholds = thresholds !== undefined && thresholds.length === 0;
  const ids = documentIds.length > 0 ? documentIds : [];
  return useQuery({
    queryKey:  [slug, 'approvals', 'check-batch', ids.sort((a, b) => a - b).join(',')],
    queryFn:   () => approvalsApi.checkBatch(ids),
    enabled:   !!slug && ids.length > 0 && !noThresholds,
    staleTime: 30_000,
  });
}

export function useApprovalThresholds() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'approvals', 'thresholds'],
    queryFn:   () => approvalsApi.thresholds(),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useApprovalMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    qc.invalidateQueries({ queryKey: [slug, 'approvals'] });
  };

  const submit = useMutation({
    mutationFn: (documentId: number) => approvalsApi.submit(documentId),
    onSuccess:  () => invalidate(),
  });

  const approve = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: number; reason?: string }) =>
      approvalsApi.approve(documentId, reason),
    onSuccess: () => invalidate(),
  });

  const reject = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: number; reason: string }) =>
      approvalsApi.reject(documentId, reason),
    onSuccess: () => invalidate(),
  });

  const storeThreshold = useMutation({
    mutationFn: (data: ApprovalThresholdInput) => approvalsApi.storeThreshold(data),
    onSuccess:  () => {
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'approvals', 'thresholds'] });
    },
  });

  return { submit, approve, reject, storeThreshold };
}
