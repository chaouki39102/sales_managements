// ════════════════════════════════════════════════
// hooks/useData.ts — تجميع hooks البيانات الأساسية
// ════════════════════════════════════════════════

import { useQuery as useQu, useMutation as useM, useQueryClient as useQC } from '@tanstack/react-query';
import { partiesApi, invoicesApi, lookupsApi } from '@/lib/api';
import type { InvoiceFilters } from '@/lib/api/invoices';
import type { PartyFilters } from '@/lib/api/invoices';
import type { CommercialDocument } from '@/types';
import type { Party } from '@/types';

const STALE = 10 * 60_000; // ✅ إضافة تعريف الثابت

// ═══════════════════ الفواتير ═══════════════════

export const INVOICES_KEYS = {
  all:    ['invoices'] as const,
  list:   (f: InvoiceFilters) => ['invoices', 'list', f] as const,
  detail: (id: number)        => ['invoices', id] as const,
};

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQu({
    queryKey: INVOICES_KEYS.list(filters),
    queryFn:  () => invoicesApi.list(filters).then(r => r.data),
  });
}

export function useInvoice(id: number) {
  return useQu({
    queryKey: INVOICES_KEYS.detail(id),
    queryFn:  () => invoicesApi.get(id).then(r => r.data.data),
    enabled:  !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQC();
  return useM({
    mutationFn: (data: Partial<CommercialDocument>) => invoicesApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useValidateInvoice() {
  const qc = useQC();
  return useM({
    mutationFn: (id: number) => invoicesApi.validate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useCancelInvoice() {
  const qc = useQC();
  return useM({
    mutationFn: (id: number) => invoicesApi.cancel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

// ═══════════════════ الأطراف ═══════════════════

export const PARTIES_KEYS = {
  all:       ['parties'] as const,
  customers: (f: object) => ['parties', 'customers', f] as const,
  suppliers: (f: object) => ['parties', 'suppliers', f] as const,
  detail:    (id: number) => ['parties', id] as const,
};

export function useCustomers(filters: PartyFilters = {}) {
  return useQu({
    queryKey: PARTIES_KEYS.customers(filters),
    queryFn:  () => partiesApi.getCustomers(filters).then(r => r.data),
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  return useQu({
    queryKey: PARTIES_KEYS.suppliers(filters),
    queryFn:  () => partiesApi.getSuppliers(filters).then(r => r.data),
  });
}

export function useCreateParty() {
  const qc = useQC();
  return useM({
    mutationFn: (data: Partial<Party>) => partiesApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

export function useUpdateParty() {
  const qc = useQC();
  return useM({
    mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
      partiesApi.update(id, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

// ═══════════════════ الجداول المرجعية ═══════════════════

export const useTreasuryAccountTypes = () => useQu({
    queryKey: ['treasury-account-types'],
    queryFn: () => lookupsApi.treasuryAccountTypes().then(r => r.data.data),
    staleTime: STALE // ✅ الآن معرف
});

export const useUnits          = () => useQu({ queryKey: ['units'],          queryFn: () => lookupsApi.units().then(r => r.data.data),           staleTime: STALE });
export const useTvas           = () => useQu({ queryKey: ['tvas'],           queryFn: () => lookupsApi.tvas().then(r => r.data.data),            staleTime: STALE });
export const useFamilies       = () => useQu({ queryKey: ['families'],       queryFn: () => lookupsApi.families().then(r => r.data.data),        staleTime: STALE });
export const useBrands         = () => useQu({ queryKey: ['brands'],         queryFn: () => lookupsApi.brands().then(r => r.data.data),          staleTime: STALE });
export const usePriceLevels    = () => useQu({ queryKey: ['price-levels'],   queryFn: () => lookupsApi.priceLevels().then(r => r.data.data),     staleTime: STALE });
export const useWarehouses     = () => useQu({ queryKey: ['warehouses'],     queryFn: () => lookupsApi.warehouses().then(r => r.data.data),      staleTime: STALE });
export const usePaymentModes   = () => useQu({ queryKey: ['payment-modes'],  queryFn: () => lookupsApi.paymentModes().then(r => r.data.data),    staleTime: STALE });
export const useTreasuryAccounts = () => useQu({ queryKey: ['treasury'],     queryFn: () => lookupsApi.treasuryAccounts().then(r => r.data.data),staleTime: STALE });
export const useCurrentFiscalYear = () => useQu({ queryKey: ['fiscal-year-current'], queryFn: () => lookupsApi.currentFiscalYear().then(r => r.data.data), staleTime: STALE });
export const useDocumentTypes  = () => useQu({ queryKey: ['document-types'], queryFn: () => lookupsApi.documentTypes().then(r => r.data.data),   staleTime: STALE });
