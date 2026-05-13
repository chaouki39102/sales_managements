// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/payments.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Payment, PaginatedResponse, ListParams } from '../core/types';

export const paymentsApi = {
  list:   (params?: ListParams)  => apiGet<PaginatedResponse<Payment>>('/payments', params),
  show:   (id: number)           => apiGet<Payment>(`/payments/${id}`),
  create: (data: Partial<Payment>) => apiPost<Payment>('/payments', data),
  update: (id: number, data: Partial<Payment>) => apiPut<Payment>(`/payments/${id}`, data),
  delete: (id: number)           => apiDelete(`/payments/${id}`),
} as const;

export function usePayments(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.payments.list(slug ?? '', params),
    queryFn:         () => paymentsApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePaymentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) }); };

  return {
    create: useMutation({ mutationFn: paymentsApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Payment> }) => paymentsApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: paymentsApi.delete,  onSuccess: inv }),
  };
}
