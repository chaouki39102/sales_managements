// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/paymentMethods.ts
// Payment Modes CRUD (tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useTenantQueryPaginated, useTenantMutation } from '@/hooks/useTenantQuery';
import type { PaymentMode, PaginatedResponse, ListParams } from '../core/types';

// ─── API ─────────────────────────────────────────────────────────────────────
export const paymentMethodsApi = {
  list:   (params?: ListParams)                => apiGet<PaginatedResponse<PaymentMode>>('/payment-modes', params),
  show:   (id: number)                         => apiGet<PaymentMode>(`/payment-modes/${id}`),
  create: (data: Partial<PaymentMode>)         => apiPost<PaymentMode>('/payment-modes', data),
  update: (id: number, data: Partial<PaymentMode>) => apiPut<PaymentMode>(`/payment-modes/${id}`, data),
  delete: (id: number)                         => apiDelete(`/payment-modes/${id}`),
} as const;

// ─── Query hooks ─────────────────────────────────────────────────────────────
export function usePaymentMethodsList(params?: ListParams) {
  return useTenantQueryPaginated(
    (slug) => tenantKeys.lookups.paymentModes(slug),
    () => paymentMethodsApi.list(params),
  );
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────
export function usePaymentMethodCreate(onSuccess?: () => void) {
  return useTenantMutation(
    (data: Partial<PaymentMode>) => paymentMethodsApi.create(data),
    (slug) => tenantKeys.lookups.paymentModes(slug),
    { onSuccess },
  );
}

export function usePaymentMethodUpdate(onSuccess?: () => void) {
  return useTenantMutation(
    ({ id, data }: { id: number; data: Partial<PaymentMode> }) => paymentMethodsApi.update(id, data),
    (slug) => tenantKeys.lookups.paymentModes(slug),
    { onSuccess },
  );
}

export function usePaymentMethodDelete(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => paymentMethodsApi.delete(id),
    (slug) => tenantKeys.lookups.paymentModes(slug),
    { onSuccess },
  );
}
