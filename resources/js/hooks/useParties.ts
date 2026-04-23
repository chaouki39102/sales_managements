// hooks/useParties.ts  — عمليات الأطراف (عملاء وموردون)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partiesApi } from '@/lib/api';
import type { Party } from '@/types';
import type { PartyFilters } from '@/lib/api/invoices';

export const PARTIES_KEYS = {
  all:       ['parties'] as const,
  customers: (f: object) => ['parties', 'customers', f] as const,
  suppliers: (f: object) => ['parties', 'suppliers', f] as const,
  detail:    (id: number) => ['parties', id] as const,
};

export function useCustomers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.customers(filters),
    queryFn:  () => partiesApi.getCustomers(filters).then(r => r.data),
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.suppliers(filters),
    queryFn:  () => partiesApi.getSuppliers(filters).then(r => r.data),
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Party>) => partiesApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
      partiesApi.update(id, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}
