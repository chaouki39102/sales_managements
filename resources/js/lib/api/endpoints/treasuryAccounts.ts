// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/treasuryAccounts.ts
// Treasury Accounts CRUD (tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import type { TreasuryAccount } from '../core/types';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface TreasuryAccountType {
  id: number;
  name: string;
  code: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export const treasuryAccountsApi = {
  list:              (params?: Record<string, unknown>)                 => apiGet<TreasuryAccount[]>('/treasury-accounts', params),
  show:              (id: number)                                       => apiGet<TreasuryAccount>(`/treasury-accounts/${id}`),
  create:            (data: Partial<TreasuryAccount>)                   => apiPost<TreasuryAccount>('/treasury-accounts', data),
  update:            (id: number, data: Partial<TreasuryAccount>)       => apiPut<TreasuryAccount>(`/treasury-accounts/${id}`, data),
  delete:            (id: number)                                       => apiDelete(`/treasury-accounts/${id}`),
  listAccountTypes:  ()                                                 => apiGet<TreasuryAccountType[]>('/treasury-account-types'),
} as const;

// ─── Query hooks ─────────────────────────────────────────────────────────────
export function useTreasuryAccountsList() {
  return useTenantQuery<TreasuryAccount[]>(
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    () => treasuryAccountsApi.list({ include: 'treasuryAccountType' }),
  );
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────
export function useTreasuryAccountCreate(onSuccess?: () => void) {
  return useTenantMutation(
    (data: Partial<TreasuryAccount>) => treasuryAccountsApi.create(data),
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    { onSuccess },
  );
}

export function useTreasuryAccountUpdate(onSuccess?: () => void) {
  return useTenantMutation(
    ({ id, data }: { id: number; data: Partial<TreasuryAccount> }) => treasuryAccountsApi.update(id, data),
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    { onSuccess },
  );
}

export function useTreasuryAccountDelete(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => treasuryAccountsApi.delete(id),
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    { onSuccess },
  );
}
