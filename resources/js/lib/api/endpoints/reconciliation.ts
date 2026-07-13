// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reconciliation.ts
// المطابقة البنكية — API + hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/client';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReconciledPayment {
  id:              number;
  payment_number:  string;
  payment_date:    string;
  amount:          number;
  party_name:      string;
  payment_mode:    string;
  treasury_account: string | null;
  reference:       string | null;
  bank_reference:  string | null;
}

export interface BankStatementEntry {
  amount:    number;
  date?:     string;
  reference?: string;
}

export interface MatchSuggestion {
  payment_id:     number;
  payment_number: string;
  amount:         number;
  confidence:     number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const reconciliationApi = {
  unreconciled: () =>
    apiGet<ReconciledPayment[]>('/reconciliation/unreconciled'),

  reconciled: () =>
    apiGet<ReconciledPayment[]>('/reconciliation/reconciled'),

  reconcile: (data: { payment_id: number; bank_reference: string; notes?: string }) =>
    apiPost('/reconciliation/reconcile', data),

  bulkReconcile: (matches: { payment_id: number; bank_reference: string; notes?: string }[]) =>
    apiPost('/reconciliation/bulk-reconcile', { matches }),

  unreconcile: (paymentId: number) =>
    apiPost(`/reconciliation/unreconcile/${paymentId}`),

  suggestMatches: (statements: BankStatementEntry[]) =>
    apiPost<MatchSuggestion[]>('/reconciliation/suggest-matches', { statements }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useReconciliationQueries() {
  const slug = useActiveSlug();

  const unreconciled = useQuery({
    queryKey:  [slug, 'reconciliation', 'unreconciled'],
    queryFn:   () => reconciliationApi.unreconciled(),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
  });

  const reconciled = useQuery({
    queryKey:  [slug, 'reconciliation', 'reconciled'],
    queryFn:   () => reconciliationApi.reconciled(),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
  });

  return { unreconciled, reconciled };
}

export function useReconciliationMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: [slug, 'reconciliation'] });
  };

  return {
    reconcile:       useMutation({ mutationFn: reconciliationApi.reconcile,       onSuccess: invalidate }),
    bulkReconcile:   useMutation({ mutationFn: reconciliationApi.bulkReconcile,   onSuccess: invalidate }),
    unreconcile:     useMutation({ mutationFn: reconciliationApi.unreconcile,     onSuccess: invalidate }),
    suggestMatches:  useMutation({ mutationFn: reconciliationApi.suggestMatches }),
  };
}
