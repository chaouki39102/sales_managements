// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/payments.ts
// الدفعات — وحدة مستقلة عن الشيكات والمستندات
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';
import type { Payment, PaginatedResponse, ListParams, PaymentStatus } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentCreateInput {
  document_ids:           number[];
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  amount:                 number;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  fiscal_year_id:         number;
}

export interface PaymentListParams extends ListParams {
  commercial_document_id?: number;
  party_id?:               number;
  payment_mode_id?:        number;
  status?:                 PaymentStatus;
  date_from?:              string;
  date_to?:                string;
  fiscal_year_id?:         number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const paymentsApi = {
  list:   (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments', params),

  show:   (id: number) =>
    apiGet<Payment>(`/payments/${id}`, {
      include: 'paymentMode,treasuryAccount,document',
    }),

  create: (data: PaymentCreateInput) =>
    apiPost<Payment>('/payments', data),

  update: (id: number, data: Partial<PaymentCreateInput>) =>
    apiPut<Payment>(`/payments/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/payments/${id}`),

  confirmed: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/confirmed', params),

  pending: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/pending', params),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayments(params?: PaymentListParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:        tenantKeys.payments.list(slug ?? '', { ...params, fiscal_year_id: yearId }),
    queryFn:         () => paymentsApi.list({ ...params, 'filter[fiscal_year_id]': yearId ?? undefined } as PaymentListParams),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePaymentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) });
  };

  const create = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess:  () => invalidate(),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentCreateInput> }) =>
      paymentsApi.update(id, data),
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess:  () => invalidate(),
  });

  return { create, update, remove };
}
