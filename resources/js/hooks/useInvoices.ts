// hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import type { InvoiceFilters } from '@/lib/api/invoices';
import type { CommercialDocument } from '@/types';

export const INVOICES_KEYS = {
  all:    ['invoices'] as const,
  list:   (f: InvoiceFilters) => ['invoices', 'list', f] as const,
  detail: (id: number)        => ['invoices', id] as const,
};

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: INVOICES_KEYS.list(filters),
    queryFn:  () => invoicesApi.list(filters).then(r => r.data),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: INVOICES_KEYS.detail(id),
    queryFn:  () => invoicesApi.get(id).then(r => r.data.data),
    enabled:  !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CommercialDocument>) => invoicesApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useValidateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invoicesApi.validate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invoicesApi.cancel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}
