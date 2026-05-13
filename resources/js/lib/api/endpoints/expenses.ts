// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/expenses.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Expense, PaginatedResponse, ListParams } from '../core/types';

export const expensesApi = {
  list:   (params?: ListParams) => apiGet<PaginatedResponse<Expense>>('/expenses', params),
  show:   (id: number)          => apiGet<Expense>(`/expenses/${id}`),
  create: (data: Partial<Expense>) => apiPost<Expense>('/expenses', data),
  update: (id: number, data: Partial<Expense>) => apiPut<Expense>(`/expenses/${id}`, data),
  delete: (id: number)          => apiDelete(`/expenses/${id}`),
} as const;

export function useExpenses(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.expenses.list(slug ?? '', params),
    queryFn:         () => expensesApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpenseMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.expenses.all(slug) }); };

  return {
    create: useMutation({ mutationFn: expensesApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) => expensesApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: expensesApi.delete,  onSuccess: inv }),
  };
}
