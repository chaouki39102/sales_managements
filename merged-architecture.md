

# =========================================
# 🧠 HOOKS
# =========================================

## FILE: resources/js/hooks/useAdmin.ts
```
// hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { adminKeys } from '@/lib/queryKeys';
import type {
  AdminCompany, AdminUser, AdminCompaniesParams,
  AdminUsersParams, AdminActivityParams,
} from '@/types/admin';

// ── Dashboard ─────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({ queryKey: adminKeys.dashboard(), queryFn: adminApi.getDashboard, staleTime: 2 * 60_000 });
}

// ── Companies ─────────────────────────────────────────
export function useAdminCompanies(params?: AdminCompaniesParams) {
  return useQuery({
    queryKey: adminKeys.companies(params),
    queryFn:  () => adminApi.getCompanies(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminCompany(id: number) {
  return useQuery({
    queryKey: adminKeys.company(id),
    queryFn:  () => adminApi.getCompany(id),
    enabled:  !!id,
  });
}

export function useAdminCompanyUsers(id: number, enabled = true) {
  return useQuery({
    queryKey: adminKeys.companyUsers(id),
    queryFn:  () => adminApi.getCompanyUsers(id),
    enabled:  !!id && enabled,
  });
}

export function useAdminCompanyMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    suspend:       useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string })          => adminApi.suspendCompany(id, reason),  onSuccess: inv }),
    unsuspend:     useMutation({ mutationFn: (id: number)                                              => adminApi.unsuspendCompany(id),        onSuccess: inv }),
    verify:        useMutation({ mutationFn: (id: number)                                              => adminApi.verifyCompany(id),           onSuccess: inv }),
    unverify:      useMutation({ mutationFn: (id: number)                                              => adminApi.unverifyCompany(id),         onSuccess: inv }),
    activate:      useMutation({ mutationFn: (id: number)                                              => adminApi.activateCompany(id),         onSuccess: inv }),
    deactivate:    useMutation({ mutationFn: (id: number)                                              => adminApi.deactivateCompany(id),       onSuccess: inv }),
    changePlan:    useMutation({ mutationFn: ({ id, ...data }: { id: number; plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) => adminApi.changePlan(id, data), onSuccess: inv }),
    deleteCompany: useMutation({ mutationFn: (id: number)                                              => adminApi.deleteCompany(id),           onSuccess: inv }),
    updateNotes:   useMutation({ mutationFn: ({ id, notes }: { id: number; notes: string })            => adminApi.updateNotes(id, notes),      onSuccess: inv }),
    addUser:       useMutation({ mutationFn: ({ companyId, userId, role }: { companyId: number; userId: number; role?: string }) => adminApi.addCompanyUser(companyId, userId, role), onSuccess: inv }),
    removeUser:    useMutation({ mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) => adminApi.removeCompanyUser(companyId, userId), onSuccess: inv }),
    toggleUser:    useMutation({ mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) => adminApi.toggleCompanyUser(companyId, userId), onSuccess: inv }),
  };
}

// ── Users ─────────────────────────────────────────────
export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn:  () => adminApi.getUsers(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    createUser:    useMutation({ mutationFn: adminApi.createUser,                                                            onSuccess: inv }),
    toggleActive:  useMutation({ mutationFn: (id: number)                                                                   => adminApi.toggleUserActive(id), onSuccess: inv }),
    resetPassword: useMutation({ mutationFn: ({ id, password, password_confirmation }: { id: number; password: string; password_confirmation: string }) => adminApi.resetPassword(id, password, password_confirmation) }),
    deleteUser:    useMutation({ mutationFn: (id: number)                                                                   => adminApi.deleteUser(id),       onSuccess: inv }),
    impersonate:   useMutation({ mutationFn: (id: number)                                                                   => adminApi.impersonateStart(id) }),
  };
}

// ── Plans ─────────────────────────────────────────────
export function useAdminPlans() {
  return useQuery({ queryKey: adminKeys.plans(), queryFn: adminApi.getPlans, staleTime: 10 * 60_000 });
}

// ── Activity ──────────────────────────────────────────
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery({
    queryKey: adminKeys.activity(params),
    queryFn:  () => adminApi.getActivityLogs(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminActivityExport() {
  return useMutation({
    mutationFn: async (params?: AdminActivityParams) => {
      const blob = await adminApi.exportActivityLogs(params) as Blob;
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: `activity_${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ── Settings ──────────────────────────────────────────
export function useAdminSettings() {
  return useQuery({ queryKey: adminKeys.settings(), queryFn: adminApi.getSystemSettings, staleTime: 5 * 60_000 });
}

export function useAdminSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSystemSettings,
    onSuccess:  () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  });
}
```

## FILE: resources/js/hooks/useClients.ts
```
```

## FILE: resources/js/hooks/useDashboard.ts
```
// ════════════════════════════════════════════════
// hooks/useDashboard.ts
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export const DASHBOARD_KEYS = {
  stats:      ['dashboard', 'stats'],
  chart:      (period: string) => ['dashboard', 'chart', period],
  topProducts:['dashboard', 'top-products'],
  invoices:   ['dashboard', 'recent-invoices'],
  inventory:  ['dashboard', 'inventory'],
};

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats,
    queryFn:  () => dashboardApi.getStats().then(r => r.data),
    staleTime: 60_000, // 1 min
  });
}

export function useSalesChart(period = 'monthly') {
  return useQuery({
    queryKey: DASHBOARD_KEYS.chart(period),
    queryFn:  () => dashboardApi.getSalesChart(period).then(r => r.data),
  });
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.topProducts,
    queryFn:  () => dashboardApi.getTopProducts(limit).then(r => r.data),
  });
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.invoices,
    queryFn:  () => dashboardApi.getRecentInvoices().then(r => r.data),
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.inventory,
    queryFn:  () => dashboardApi.getInventoryAlerts().then(r => r.data),
  });
}
```

## FILE: resources/js/hooks/useData.ts
```
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
```

## FILE: resources/js/hooks/useDebounce.ts
```
// hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import { tenantKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';

function useSlug() { return useAuth().activeCompany?.slug ?? ''; }

export function useDashboardStats() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.stats(slug),        queryFn: dashboardApi.getStats,          enabled: !!slug, staleTime: 60_000 });
}

export function useSalesChart(period = 'monthly') {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.chart(slug, period), queryFn: () => dashboardApi.getSalesChart(period), enabled: !!slug });
}

export function useTopProducts(limit = 5) {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.topProducts(slug),  queryFn: () => dashboardApi.getTopProducts(limit), enabled: !!slug });
}

export function useRecentInvoices() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.recent(slug),       queryFn: dashboardApi.getRecentInvoices,  enabled: !!slug });
}

export function useInventoryAlerts() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.inventory(slug),    queryFn: dashboardApi.getInventoryAlerts, enabled: !!slug });
}
```

## FILE: resources/js/hooks/useInvoices.ts
```
// ═══════════════════════════════════════════════════════
// hooks/useInvoices.ts
// ═══════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api/invoices';
import { tenantKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';
import type { CommercialDocument } from '@/types';
import type { InvoiceFilters } from '@/types/filters';

function useSlug() {
  return useAuth().activeCompany?.slug ?? '';
}

export function useInvoices(filters: InvoiceFilters = {}) {
  const slug = useSlug();
  return useQuery({
    queryKey:  tenantKeys.invoices.list(slug, filters),
    queryFn:   () => invoicesApi.list(filters),
    enabled:   !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: number) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.invoices.detail(slug, id),
    queryFn:  () => invoicesApi.get(id),
    enabled:  !!slug && !!id,
  });
}

export function useInvoiceMutations() {
  const qc   = useQueryClient();
  const slug = useSlug();
  const invalidate = () => qc.invalidateQueries({ queryKey: tenantKeys.invoices.all(slug) });

  return {
    create: useMutation({
      mutationFn: (data: Partial<CommercialDocument>) => invoicesApi.create(data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<CommercialDocument> }) => invoicesApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => invoicesApi.delete(id),
      onSuccess: invalidate,
    }),
    validate: useMutation({
      mutationFn: (id: number) => invoicesApi.validate(id),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (id: number) => invoicesApi.cancel(id),
      onSuccess: invalidate,
    }),
    lock: useMutation({
      mutationFn: (id: number) => invoicesApi.lock(id),
      onSuccess: invalidate,
    }),
    unlock: useMutation({
      mutationFn: (id: number) => invoicesApi.unlock(id),
      onSuccess: invalidate,
    }),
    duplicate: useMutation({
      mutationFn: (id: number) => invoicesApi.duplicate(id),
      onSuccess: invalidate,
    }),
  };
}
```

## FILE: resources/js/hooks/useLookup.ts
```
// ════════════════════════════════════════════════
// resources/js/hooks/useLookup.ts
// Hook عام لصفحات الجداول البسيطة (CRUD)
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api/core/client';

export interface LookupState<T> {
  items:    T[];
  loading:  boolean;
  error:    string | null;
  saving:   boolean;
}

export interface UseLookupReturn<T> {
  items:    T[];
  loading:  boolean;
  error:    string | null;
  saving:   boolean;
  refetch:  () => void;
  create:   (data: Partial<T>) => Promise<void>;
  update:   (id: number, data: Partial<T>) => Promise<void>;
  remove:   (id: number) => Promise<void>;
}

export function useLookup<T extends { id: number }>(endpoint: string): UseLookupReturn<T> {
  const [state, setState] = useState<LookupState<T>>({
    items: [], loading: true, error: null, saving: false,
  });

  const fetchAll = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiClient.get<{ data: T[] }>(endpoint);
      // يدعم كلا الشكلين: { data: [...] } أو { data: { data: [...] } }
      const raw = (res.data as any);
      const items: T[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.data?.data)
          ? raw.data.data
          : [];
      setState(s => ({ ...s, items, loading: false }));
    } catch (e: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: e?.response?.data?.message || 'حدث خطأ في جلب البيانات',
      }));
    }
  }, [endpoint]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const res = await apiClient.post<{ data: T }>(endpoint, data);
      const newItem = res.data.data;
      setState(s => ({ ...s, items: [newItem, ...s.items], saving: false }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل الحفظ');
    }
  }, [endpoint]);

  const update = useCallback(async (id: number, data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const res = await apiClient.put<{ data: T }>(`${endpoint}/${id}`, data);
      const updated = res.data.data;
      setState(s => ({
        ...s,
        items: s.items.map(i => i.id === id ? updated : i),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل التحديث');
    }
  }, [endpoint]);

  const remove = useCallback(async (id: number) => {
    setState(s => ({ ...s, saving: true }));
    try {
      await apiClient.delete(`${endpoint}/${id}`);
      setState(s => ({
        ...s,
        items: s.items.filter(i => i.id !== id),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل الحذف');
    }
  }, [endpoint]);

  return { ...state, refetch: fetchAll, create, update, remove };
}
```

## FILE: resources/js/hooks/useLookups.ts
```
// ═══════════════════════════════════════════════════════
// hooks/useLookups.ts — الملف الوحيد للجداول المرجعية
// يستبدل: useLookup.ts + useLookups.ts + الجزء المرجعي من useData.ts
// ═══════════════════════════════════════════════════════
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lookupsApi } from '@/lib/api/lookups';
import { lookupKeys } from '@/lib/queryKeys';
import type {
  Unit, Tva, Family, Brand, PriceLevel, Warehouse, Currency,
  DocumentType, DocumentStatus, PaymentMode, TreasuryAccount,
  FiscalYear, Gender, Wilaya, Commune,
} from '@/types';

const STALE = Infinity; // جداول مرجعية نادراً ما تتغير

// ── Hooks فردية ───────────────────────────────────────
export const useUnits            = () => useQuery<Unit[]>           ({ queryKey: lookupKeys.units(),             queryFn: lookupsApi.units,             staleTime: STALE });
export const useTvas             = () => useQuery<Tva[]>            ({ queryKey: lookupKeys.tvas(),              queryFn: lookupsApi.tvas,              staleTime: STALE });
export const useFamilies         = () => useQuery<Family[]>         ({ queryKey: lookupKeys.families(),          queryFn: lookupsApi.families,          staleTime: STALE });
export const useBrands           = () => useQuery<Brand[]>          ({ queryKey: lookupKeys.brands(),            queryFn: lookupsApi.brands,            staleTime: STALE });
export const useCurrencies       = () => useQuery<Currency[]>       ({ queryKey: lookupKeys.currencies(),        queryFn: lookupsApi.currencies,        staleTime: STALE });
export const usePriceLevels      = () => useQuery<PriceLevel[]>     ({ queryKey: lookupKeys.priceLevels(),       queryFn: lookupsApi.priceLevels,       staleTime: STALE });
export const useWarehouses       = () => useQuery<Warehouse[]>      ({ queryKey: lookupKeys.warehouses(),        queryFn: lookupsApi.warehouses,        staleTime: STALE });
export const usePaymentModes     = () => useQuery<PaymentMode[]>    ({ queryKey: lookupKeys.paymentModes(),      queryFn: lookupsApi.paymentModes,      staleTime: STALE });
export const useDocumentTypes    = () => useQuery<DocumentType[]>   ({ queryKey: lookupKeys.documentTypes(),     queryFn: lookupsApi.documentTypes,     staleTime: STALE });
export const useDocumentStatuses = () => useQuery<DocumentStatus[]> ({ queryKey: lookupKeys.documentStatuses(),  queryFn: lookupsApi.documentStatuses,  staleTime: STALE });
export const useTreasuryAccounts = () => useQuery<TreasuryAccount[]>({ queryKey: lookupKeys.treasuryAccounts(),  queryFn: lookupsApi.treasuryAccounts,  staleTime: STALE });
export const useExpenseCategories= () => useQuery<any[]>            ({ queryKey: lookupKeys.expenseCategories(), queryFn: lookupsApi.expenseCategories, staleTime: STALE });
export const useProductTypes     = () => useQuery<any[]>            ({ queryKey: lookupKeys.productTypes(),      queryFn: lookupsApi.productTypes,      staleTime: STALE });
export const useValuationMethods = () => useQuery<any[]>            ({ queryKey: lookupKeys.valuationMethods(),  queryFn: lookupsApi.valuationMethods,  staleTime: STALE });
export const useGenders          = () => useQuery<Gender[]>         ({ queryKey: lookupKeys.genders(),           queryFn: lookupsApi.genders,           staleTime: STALE });
export const useLegalForms       = () => useQuery<any[]>            ({ queryKey: lookupKeys.legalForms(),        queryFn: lookupsApi.legalForms,        staleTime: STALE });
export const usePartyTypes       = () => useQuery<any[]>            ({ queryKey: lookupKeys.partyTypes(),        queryFn: lookupsApi.partyTypes,        staleTime: STALE });
export const useWilayas          = () => useQuery<Wilaya[]>         ({ queryKey: lookupKeys.wilayas(),           queryFn: lookupsApi.wilayas,           staleTime: STALE });
export const useTreasuryAccountTypes = () => useQuery<any[]>({ queryKey: lookupKeys.treasuryAccountTypes(), queryFn: lookupsApi.treasuryAccountTypes, staleTime: STALE });

export function useCommunes(wilayaId?: number) {
  return useQuery<Commune[]>({
    queryKey: lookupKeys.communes(wilayaId),
    queryFn:  () => lookupsApi.communes(wilayaId),
    staleTime: STALE,
    enabled:  true,
  });
}

// ── Hook مجمَّع لصفحة المنتج (عدة lookups دفعة واحدة) ──
export function useProductLookups() {
  const families         = useFamilies();
  const brands           = useBrands();
  const units            = useUnits();
  const tvas             = useTvas();
  const priceLevels      = usePriceLevels();
  const warehouses       = useWarehouses();
  const productTypes     = useProductTypes();
  const valuationMethods = useValuationMethods();

  return {
    families:         families.data         ?? [],
    brands:           brands.data           ?? [],
    units:            units.data            ?? [],
    tvas:             tvas.data             ?? [],
    priceLevels:      priceLevels.data      ?? [],
    warehouses:       warehouses.data       ?? [],
    productTypes:     productTypes.data     ?? [],
    valuationMethods: valuationMethods.data ?? [],
    isLoading: families.isLoading || brands.isLoading || units.isLoading,
  };
}

// ── Hook مجمَّع لصفحة الأطراف ──────────────────────────
export function usePartyLookups() {
  const partyTypes = usePartyTypes();
  const legalForms = useLegalForms();
  const currencies = useCurrencies();
  const wilayas    = useWilayas();

  return {
    partyTypes: partyTypes.data ?? [],
    legalForms: legalForms.data ?? [],
    currencies: currencies.data ?? [],
    wilayas:    wilayas.data    ?? [],
    isLoading:  partyTypes.isLoading,
  };
}

// ── Hook مجمَّع للفاتورة ───────────────────────────────
export function useInvoiceLookups() {
  const documentTypes    = useDocumentTypes();
  const documentStatuses = useDocumentStatuses();
  const warehouses       = useWarehouses();
  const paymentModes     = usePaymentModes();
  const treasuryAccounts = useTreasuryAccounts();
  const tvas             = useTvas();

  return {
    documentTypes:    documentTypes.data    ?? [],
    documentStatuses: documentStatuses.data ?? [],
    warehouses:       warehouses.data       ?? [],
    paymentModes:     paymentModes.data     ?? [],
    treasuryAccounts: treasuryAccounts.data ?? [],
    tvas:             tvas.data             ?? [],
    isLoading: documentTypes.isLoading,
  };
}

// ── Invalidation helper ────────────────────────────────
export function useInvalidateLookups() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: lookupKeys.all });
}
```

## FILE: resources/js/hooks/useModal.ts
```
// hooks/useModal.ts
import { useState, useCallback } from 'react';

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  const openModal  = useCallback(() => setOpen(true),  []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggle     = useCallback(() => setOpen(v => !v), []);
  return { open, openModal, closeModal, toggle };
}
```

## FILE: resources/js/hooks/usePagination.ts
```
/**
 * usePagination
 * ─────────────────────────────────────────────────────
 * مبني على بنية ردود ApiResponders.php الحقيقية:
 *
 * {
 *   status: 'success',
 *   message: '...',
 *   timestamp: '...',
 *   data: [...],           ← items المصفوفة الفعلية
 *   meta: {
 *     current_page,
 *     last_page,
 *     per_page,
 *     total,
 *     from,
 *     to,
 *     has_more_pages,
 *     is_first_page,
 *     is_last_page,
 *   },
 *   links: {
 *     first, last, prev, next, current
 *   }
 * }
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types matching backend exactly ──────────────────────────────────────────

export interface BackendMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
  is_first_page: boolean;
  is_last_page: boolean;
}

export interface BackendLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
  current: string;
}

export interface BackendListResponse<T> {
  status: 'success' | 'error';
  message: string;
  timestamp: string;
  data: T[];
  meta: BackendMeta;
  links: BackendLinks;
}

export interface BackendErrorResponse {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

// ── Params ───────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  filter?: Record<string, string | number | boolean | undefined>;
  include?: string;
  export?: 'csv' | 'xlsx' | 'json';
  [key: string]: unknown;
}

export interface UsePaginationOptions<T> {
  /** دالة الجلب — تستقبل الـ params وترجع Promise ببنية الـ Backend */
  fetcher: (params: PaginationParams) => Promise<BackendListResponse<T>>;
  /** الـ params الابتدائية */
  initialParams?: PaginationParams;
  /** تشغيل الجلب فوراً */
  immediate?: boolean;
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UsePaginationReturn<T> {
  // Data
  data: T[];
  meta: BackendMeta | null;
  links: BackendLinks | null;
  // State
  loading: boolean;
  error: string | null;
  // Params
  params: PaginationParams;
  // Actions
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setSort: (sort: string) => void;
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string | number | boolean | undefined) => void;
  setFilters: (filters: Record<string, string | number | boolean | undefined>) => void;
  resetFilters: () => void;
  refresh: () => void;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePagination<T>({
  fetcher,
  initialParams = {},
  immediate = true,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<BackendMeta | null>(null);
  const [links, setLinks] = useState<BackendLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    per_page: 15,
    ...initialParams,
  });

  const abortRef = useRef<AbortController | null>(null);
  const initialFired = useRef(false);

  const fetch = useCallback(async (p: PaginationParams) => {
    // إلغاء أي طلب سابق
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // تنظيف الـ params من القيم الفارغة
      const cleanParams: PaginationParams = {};
      for (const [k, v] of Object.entries(p)) {
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
          // filter object: تنظيف القيم الفارغة
          const clean: Record<string, string | number | boolean> = {};
          for (const [fk, fv] of Object.entries(v)) {
            if (fv !== undefined && fv !== null && fv !== '') {
              clean[fk] = fv as string | number | boolean;
            }
          }
          if (Object.keys(clean).length > 0) cleanParams[k] = clean;
        } else {
          cleanParams[k] = v;
        }
      }

      const response = await fetcher(cleanParams);

      if (response.status === 'success') {
        setData(response.data);
        setMeta(response.meta);
        setLinks(response.links);
      } else {
        setError(response.message ?? 'حدث خطأ في جلب البيانات');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  // Auto-fetch on params change
  useEffect(() => {
    if (!immediate && !initialFired.current) {
      initialFired.current = true;
      return;
    }
    initialFired.current = true;
    fetch(params);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page reset helpers ───────────────────────────────────────────────────

  const updateParams = useCallback((updates: Partial<PaginationParams>, resetPage = false) => {
    setParams(prev => ({
      ...prev,
      ...(resetPage ? { page: 1 } : {}),
      ...updates,
    }));
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const setPage = useCallback((page: number) => {
    updateParams({ page });
  }, [updateParams]);

  const setPerPage = useCallback((per_page: number) => {
    updateParams({ per_page, page: 1 });
  }, [updateParams]);

  const setSort = useCallback((sort: string) => {
    updateParams({ sort, page: 1 });
  }, [updateParams]);

  const setSearch = useCallback((search: string) => {
    updateParams({ search, page: 1 });
  }, [updateParams]);

  const setFilter = useCallback((key: string, value: string | number | boolean | undefined) => {
    setParams(prev => ({
      ...prev,
      page: 1,
      filter: { ...(prev.filter ?? {}), [key]: value },
    }));
  }, []);

  const setFilters = useCallback((filters: Record<string, string | number | boolean | undefined>) => {
    setParams(prev => ({
      ...prev,
      page: 1,
      filter: filters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setParams(prev => ({ ...prev, page: 1, filter: {}, search: '' }));
  }, []);

  const refresh = useCallback(() => {
    fetch(params);
  }, [fetch, params]);

  const goNext = useCallback(() => {
    if (meta?.has_more_pages) setPage((meta?.current_page ?? 1) + 1);
  }, [meta, setPage]);

  const goPrev = useCallback(() => {
    if (!meta?.is_first_page) setPage((meta?.current_page ?? 1) - 1);
  }, [meta, setPage]);

  const goFirst = useCallback(() => setPage(1), [setPage]);

  const goLast = useCallback(() => {
    if (meta?.last_page) setPage(meta.last_page);
  }, [meta, setPage]);

  return {
    data, meta, links,
    loading, error,
    params,
    setPage, setPerPage, setSort, setSearch,
    setFilter, setFilters, resetFilters,
    refresh,
    goNext, goPrev, goFirst, goLast,
  };
}
```

## FILE: resources/js/hooks/useParties.ts
```
// hooks/useParties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partiesApi } from '@/lib/api/parties';
import { tenantKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';
import type { Party } from '@/types';
import type { PartyFilters } from '@/types/filters';

function useSlug() { return useAuth().activeCompany?.slug ?? ''; }

export function useCustomers(filters: PartyFilters = {}) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.parties.customers(slug, filters),
    queryFn:  () => partiesApi.getCustomers(filters),
    enabled:  !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.parties.suppliers(slug, filters),
    queryFn:  () => partiesApi.getSuppliers(filters),
    enabled:  !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useParty(id: number) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.parties.detail(slug, id),
    queryFn:  () => partiesApi.get(id),
    enabled:  !!slug && !!id,
  });
}

export function usePartyMutations() {
  const qc   = useQueryClient();
  const slug = useSlug();
  const invalidate = () => qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) });

  return {
    create: useMutation({
      mutationFn: (data: Partial<Party>) => partiesApi.create(data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) => partiesApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => partiesApi.delete(id),
      onSuccess: invalidate,
    }),
  };
}
```

## FILE: resources/js/hooks/useProducts.ts
```
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, variantsApi } from '@/lib/api/products';
import { tenantKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';
import type { Product, ProductVariant } from '@/types';
import type { ProductFilters, VariantFilters } from '@/types/filters';

function useSlug() { return useAuth().activeCompany?.slug ?? ''; }

// ── Products ──────────────────────────────────────────
export function useProducts(filters: ProductFilters = {}) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.products.list(slug, filters),
    queryFn:  () => productsApi.list(filters),
    enabled:  !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: number) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.products.detail(slug, id),
    queryFn:  () => productsApi.get(id),
    enabled:  !!slug && !!id,
  });
}

export function useActiveProducts() {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.products.active(slug),
    queryFn:  productsApi.getActive,
    enabled:  !!slug,
  });
}

export function useProductMutations() {
  const qc   = useQueryClient();
  const slug = useSlug();
  const invalidate = () => qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });

  return {
    create: useMutation({ mutationFn: (d: Partial<Product>)                         => productsApi.create(d),          onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => productsApi.update(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number)                                  => productsApi.delete(id),          onSuccess: invalidate }),
  };
}

// ── Variants ──────────────────────────────────────────
export function useVariants(filters: VariantFilters = {}) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.variants.list(slug, filters),
    queryFn:  () => variantsApi.list(filters),
    enabled:  !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useVariant(id: number) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.variants.detail(slug, id),
    queryFn:  () => variantsApi.get(id),
    enabled:  !!slug && !!id,
  });
}

export function useLowStockVariants() {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.variants.lowStock(slug),
    queryFn:  variantsApi.getLowStock,
    enabled:  !!slug,
  });
}

export function useVariantByBarcode(barcode: string) {
  const slug = useSlug();
  return useQuery({
    queryKey: tenantKeys.variants.barcode(slug, barcode),
    queryFn:  () => variantsApi.byBarcode(barcode),
    enabled:  !!slug && !!barcode,
  });
}

export function useVariantMutations() {
  const qc   = useQueryClient();
  const slug = useSlug();
  const invalidate = () => qc.invalidateQueries({ queryKey: tenantKeys.variants.all(slug) });

  return {
    create: useMutation({ mutationFn: (d: Partial<ProductVariant>)                             => variantsApi.create(d),          onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) => variantsApi.update(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number)                                             => variantsApi.delete(id),          onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/hooks/useTheme.ts
```
// hooks/useTheme.ts
import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  const toggle = () => setDark(v => !v);
  return { dark, toggle };
}
```

## FILE: resources/js/hooks/useTopbarTitle.ts
```
// hooks/useTopbarTitle.ts
// يُعيد عنوان الصفحة الحالية والمسار التفصيلي بناءً على الـ URL
import { useLocation } from 'react-router-dom';

interface PageMeta {
  title: string;
  path:  string;
}

const META: Record<string, PageMeta> = {
  '/dashboard':    { title:'لوحة التحكم',         path:'الرئيسية ← إحصائيات'       },
  '/pos':          { title:'نقطة البيع',           path:'الرئيسية ← POS'            },
  '/invoices':     { title:'الفواتير',             path:'مبيعات ← فواتير'           },
  '/orders':       { title:'طلبيات الشراء',         path:'مبيعات ← طلبيات'          },
  '/returns':      { title:'المرتجعات',             path:'مبيعات ← مرتجعات'         },
  '/quotations':   { title:'عروض الأسعار',          path:'مبيعات ← عروض أسعار'      },
  '/bl':           { title:'وصل التسليم BL',        path:'مبيعات ← وصل تسليم'       },
  '/products':     { title:'المنتجات',              path:'مخزون ← منتجات'           },
  '/inventory':    { title:'إدارة المخزون',         path:'مخزون ← جرد'              },
  '/categories':   { title:'الفئات',               path:'مخزون ← فئات'             },
  '/brands':       { title:'العلامات التجارية',     path:'مخزون ← علامات'           },
  '/units':        { title:'وحدات القياس',          path:'مخزون ← وحدات'            },
  '/suppliers':    { title:'الموردون',              path:'مخزون ← موردون'           },
  '/warehouses':   { title:'المستودعات',            path:'مخزون ← مستودعات'         },
  '/clients':      { title:'العملاء',               path:'محاسبة ← عملاء'           },
  '/finance':      { title:'الخزينة',               path:'محاسبة ← خزينة'           },
  '/expenses':     { title:'المصروفات',             path:'محاسبة ← مصروفات'         },
  '/debts':        { title:'الديون',                path:'محاسبة ← ديون'            },
  '/tva':          { title:'إقرار TVA — G50',       path:'محاسبة ← TVA'             },
  '/fiscal':       { title:'الملف الجبائي',         path:'محاسبة ← جبايات'          },
  '/fiscalyears':  { title:'السنوات المالية',        path:'محاسبة ← سنوات مالية'     },
  '/currencies':   { title:'العملات',               path:'محاسبة ← عملات'           },
  '/pricelevels':  { title:'مستويات الأسعار',       path:'محاسبة ← مستويات أسعار'   },
  '/employees':    { title:'الموظفون',              path:'موارد بشرية ← موظفون'      },
  '/reports':      { title:'التقارير',              path:'تقارير'                    },
  '/balance':      { title:'الميزانية التقديرية',   path:'تقارير ← ميزانية'         },
  '/users':        { title:'المستخدمون',            path:'نظام ← مستخدمون'          },
  '/settings':     { title:'الإعدادات',             path:'نظام ← إعدادات'           },
};

export function useTopbarTitle(): PageMeta {
  const { pathname } = useLocation();
  return META[pathname] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
}
```

## FILE: resources/js/pos/hooks/usePOS.ts
```
// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════
// Hook موحّد يجمع POSStore + CartStore
// ════════════════════════════════════
import { usePOSStore } from './usePOSStore';
import { useCartStore } from '../utils/useCartStore';

export function usePOS() {
  // ── POS Store ──────────────────────────────
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const holdCart          = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Cart Store ─────────────────────────────
  const items             = useCartStore(s => s.items);
  const client            = useCartStore(s => s.client);
  const addItem           = useCartStore(s => s.addItem);
  const removeItem        = useCartStore(s => s.removeItem);
  const updateQty         = useCartStore(s => s.updateQty);
  const clearCart         = useCartStore(s => s.clearCart);
  const setClient         = useCartStore(s => s.setClient);
  const totals            = useCartStore(s => s.totals);

  return {
    // Session
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    // Held carts
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    // UI
    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    // Cart
    items, client, addItem, removeItem, updateQty, clearCart, setClient, totals,
  };
}
```

## FILE: resources/js/pos/hooks/usePOSStore.ts
```
// ════════════════════════════════════════════════
// store/usePOSStore.ts — حالة نقطة البيع الكاملة
// ════════════════════════════════════════════════
import { create } from 'zustand';
import type { HeldCart } from '@/types';
import { nanoid } from 'nanoid';
import { useCartStore } from '../utils/useCartStore';

interface POSState {
  // Session
  sessionStarted:    boolean;
  sessionInvoices:   number;
  sessionSales:      number;

  // Held carts
  heldCarts:         HeldCart[];

  // UI state
  activeTab:         'products' | 'clients' | 'held';
  searchQuery:       string;
  selectedCategory:  number | null;
  paymentModalOpen:  boolean;

  // Actions
  startSession:      () => void;
  endSession:        () => void;
  incrementSession:  (amount: number) => void;

  holdCart:          (label?: string) => void;
  restoreCart:       (id: string) => void;
  deleteHeldCart:    (id: string) => void;

  setTab:            (tab: POSState['activeTab']) => void;
  setSearch:         (q: string) => void;
  setCategory:       (id: number | null) => void;
  openPayment:       () => void;
  closePayment:      () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () => set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),
  endSession:   () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set(s => ({ sessionInvoices: s.sessionInvoices + 1, sessionSales: s.sessionSales + amount })),

  holdCart: (label) => {
    const cart  = useCartStore.getState();
    const items = cart.items;
    if (items.length === 0) return;
    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals:     cart.totals(),
      client:     cart.client,
      created_at: new Date().toISOString(),
    };
    set(s => ({ heldCarts: [...s.heldCarts, held] }));
    cart.clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find(c => c.id === id);
    if (!held) return;
    const cart = useCartStore.getState();
    // Restore items directly
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) })),

  setTab:      (tab)  => set({ activeTab: tab }),
  setSearch:   (q)    => set({ searchQuery: q }),
  setCategory: (id)   => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));


// ════════════════════════════════════════════════
// store/useUIStore.ts — الحالة العامة للواجهة
// ════════════════════════════════════════════════
import { create as cr } from 'zustand';
import { persist as ps } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  notifications:   number;
  // actions
  toggleSidebar:   () => void;
  setNotifications:(n: number) => void;
}

export const useUIStore = cr<UIState>()(
  ps(
    (set) => ({
      sidebarCollapsed: false,
      notifications:   0,
      toggleSidebar:   () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNotifications:(n) => set({ notifications: n }),
    }),
    { name: 'ui-state' }
  )
);
```



# =========================================
# 🌐 CONTEXT
# =========================================

## FILE: resources/js/context/AuthContext.tsx
```
// ═══════════════════════════════════════════════════════
// context/AuthContext.tsx
// ═══════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient, { setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api/core/client';
import { lookupsApi } from '@/lib/api/lookups';
import { lookupKeys } from '@/lib/queryKeys';
import type { User, LoginCredentials } from '@/types';

// ── Storage ───────────────────────────────────────────
const ACTIVE_COMPANY_KEY = 'active_company';
const AUTH_USER_KEY      = 'auth_user';

export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

// ── Helpers ───────────────────────────────────────────
const storage = {
  getCompany: (): ActiveCompany | null => {
    try { const r = sessionStorage.getItem(ACTIVE_COMPANY_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  setCompany: (c: ActiveCompany | null) => {
    try { c ? sessionStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(c)) : sessionStorage.removeItem(ACTIVE_COMPANY_KEY); }
    catch {}
  },
  getUser: (): User | null => {
    try { const r = localStorage.getItem(AUTH_USER_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  setUser:   (u: User) => { try { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)); } catch {} },
  clearUser: ()        => { try { localStorage.removeItem(AUTH_USER_KEY); } catch {} },
};

// ── Context ───────────────────────────────────────────
interface AuthContextValue {
  user:             User | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  activeCompany:    ActiveCompany | null;
  login:            (creds: LoginCredentials) => Promise<User>;
  logout:           () => Promise<void>;
  updateUser:       (data: Partial<User>) => void;
  setActiveCompany: (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Lookups المُسبقة (تُحمَّل بعد تحديد الشركة) ────────
const PREFETCH_ENTRIES = [
  { key: lookupKeys.units(),         fn: lookupsApi.units },
  { key: lookupKeys.tvas(),          fn: lookupsApi.tvas },
  { key: lookupKeys.families(),      fn: lookupsApi.families },
  { key: lookupKeys.brands(),        fn: lookupsApi.brands },
  { key: lookupKeys.currencies(),    fn: lookupsApi.currencies },
  { key: lookupKeys.priceLevels(),   fn: lookupsApi.priceLevels },
  { key: lookupKeys.warehouses(),    fn: lookupsApi.warehouses },
  { key: lookupKeys.paymentModes(),  fn: lookupsApi.paymentModes },
  { key: lookupKeys.documentTypes(), fn: lookupsApi.documentTypes },
] as const;

// ── Provider ──────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,          setUser]          = useState<User | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [activeCompany, setActiveCompanyState] = useState<ActiveCompany | null>(storage.getCompany);
  const queryClient = useQueryClient();

  const prefetchLookups = useCallback(() => {
    PREFETCH_ENTRIES.forEach(({ key, fn }) => {
      queryClient.prefetchQuery({ queryKey: key, queryFn: fn });
    });
  }, [queryClient]);

  // استعادة الجلسة عند تحميل التطبيق
  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setIsLoading(false); return; }

    // استخدم المستخدم المخزّن فوراً (لا waiting)
    const cached = storage.getUser();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
      if (activeCompany) prefetchLookups();
    }

    // تحقق من الـ token في الخلفية
    apiClient.get<{ data: User }>('/auth/me')
      .then(res => {
        const fresh = res.data.data;
        setUser(fresh);
        storage.setUser(fresh);
        if (!cached && activeCompany) prefetchLookups();
      })
      .catch(() => {
        clearAuthToken();
        storage.clearUser();
        storage.setCompany(null);
        setUser(null);
        setActiveCompanyState(null);
      })
      .finally(() => { if (!cached) setIsLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تحميل lookups عند تغيير الشركة
  useEffect(() => {
    if (activeCompany && user) prefetchLookups();
  }, [activeCompany?.slug, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (creds: LoginCredentials): Promise<User> => {
    const res = await apiClient.post<{ data: { user: User; token: string } }>('/auth/login', creds);
    setAuthToken(res.data.data.token);

    const meRes = await apiClient.get<{ data: User }>('/auth/me');
    const fullUser = meRes.data.data;
    setUser(fullUser);
    storage.setUser(fullUser);
    return fullUser;
  }, []);

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    clearAuthToken();
    storage.clearUser();
    storage.setCompany(null);
    setUser(null);
    setActiveCompanyState(null);
    queryClient.clear();
    window.location.href = '/login';
  }, [queryClient]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(u => {
      if (!u) return null;
      const updated = { ...u, ...data };
      storage.setUser(updated);
      return updated;
    });
  }, []);

  const setActiveCompany = useCallback((company: ActiveCompany) => {
    setActiveCompanyState(company);
    storage.setCompany(company);
    // أبطل كل caches التينانت عند تغيير الشركة
    queryClient.removeQueries({ predicate: q => {
      const key = q.queryKey[0] as string;
      return ['invoices','parties','products','variants','dashboard','fiscal-years'].includes(key);
    }});
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      activeCompany,
      login,
      logout,
      updateUser,
      setActiveCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const useAuthUser = () => useAuth().user;
```

## FILE: resources/js/context/FiscalYearContext.tsx
```
// resources/js/context/FiscalYearContext.tsx
// ════════════════════════════════════════════════
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import type { FiscalYear } from '@/types';

// ── Types ───────────────────────────────────────
interface FiscalYearContextType {
  years:           FiscalYear[];
  selectedYear:    FiscalYear | null;
  currentYear:     FiscalYear | null;
  setSelectedYear: (year: FiscalYear) => void;
  goToCurrentYear: () => void;
  isLoading:       boolean;
  hasMultipleOpen: boolean;
  refetch:         () => void;   // ✅ لإعادة الجلب بعد إنشاء سنة
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────
export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, activeCompany } = useAuth();
  const [selectedYear, setSelectedYearState] = useState<FiscalYear | null>(null);
  const qc = useQueryClient();

  // ✅ المفتاح يحتوي slug الشركة → يُبطَل تلقائياً عند تغيير الشركة
  const queryKey = ['fiscal-years', activeCompany?.slug ?? null];

  const { data: years = [], isLoading, refetch } = useQuery<FiscalYear[]>({
    queryKey,
    queryFn: async () => {
      // ✅ نستخدم /{slug}/fiscal-years مثل بقية الكود
      const slug = activeCompany?.slug;
      if (!slug) return [];
      const res = await apiClient.get(`/${slug}/fiscal-years`, { params: { per_page: 50 } });
      // دفاعي: يدعم r.data.data و r.data مباشرة
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    // ✅ لا نجلب إلا بعد تسجيل الدخول وتحديد الشركة
    enabled: isAuthenticated && !authLoading && !!activeCompany?.slug,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const currentYear = useMemo(
    () => years.find(y => y.is_current) ?? years.find(y => !y.is_closed) ?? years[0] ?? null,
    [years]
  );

  // ✅ إعادة ضبط selectedYear عند تغيير الشركة
  useEffect(() => {
    setSelectedYearState(null);
  }, [activeCompany?.slug]);

  // تعيين السنة: sessionStorage أولاً ثم الحالية
  useEffect(() => {
    if (years.length === 0 || selectedYear) return;

    try {
      const saved = sessionStorage.getItem('selected_fiscal_year');
      if (saved) {
        const found = years.find(y => y.id === Number(saved));
        if (found) { setSelectedYearState(found); return; }
      }
    } catch {}

    setSelectedYearState(currentYear);
  }, [years, currentYear, selectedYear]);

  const setSelectedYear = useCallback((year: FiscalYear) => {
    setSelectedYearState(year);
    try { sessionStorage.setItem('selected_fiscal_year', String(year.id)); } catch {}
  }, []);

  const goToCurrentYear = useCallback(() => {
    if (currentYear) setSelectedYearState(currentYear);
  }, [currentYear]);

  const hasMultipleOpen = useMemo(
    () => years.filter(y => !y.is_closed).length > 1,
    [years]
  );

  return (
    <FiscalYearContext.Provider value={{
      years, selectedYear, currentYear,
      setSelectedYear, goToCurrentYear,
      isLoading, hasMultipleOpen,
      refetch,
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYear(): FiscalYearContextType {
  const ctx = useContext(FiscalYearContext);
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider');
  return ctx;
}

// ── FiscalYearSelector (Topbar) ─────────────────
export function FiscalYearSelector() {
  const { years, selectedYear, setSelectedYear, isLoading } = useFiscalYear();
  const [open, setOpen] = useState(false);

  const openYears   = years.filter(y => !y.is_closed);
  const closedYears = years.filter(y => y.is_closed);

  if (isLoading) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
        background:'var(--bg3)', border:'1px solid var(--b2)', borderRadius:'var(--r2)',
        fontSize:12, color:'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation:'spin .8s linear infinite' }} />
        تحميل...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!selectedYear) return null;

  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
          borderRadius:'var(--r2)', border:'1px solid var(--b2)', background:'var(--bg3)',
          cursor:'pointer', transition:'.15s', fontFamily:'Tajawal,sans-serif',
        }}
      >
        <i className={`ti ${selectedYear.is_closed ? 'ti-lock' : 'ti-calendar-check'}`}
           style={{ color: selectedYear.is_closed ? 'var(--t4)' : 'var(--em)', fontSize:14 }} />
        <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{selectedYear.name}</span>
        {selectedYear.is_current && <i className="ti ti-star-filled" style={{ color:'var(--gold)', fontSize:10 }} />}
        {selectedYear.is_closed && <span style={{ fontSize:9, color:'var(--t4)' }}>مقفلة</span>}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize:11, color:'var(--t4)' }} />
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:10000 }} onClick={() => setOpen(false)} />
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:240,
            background:'var(--bg2)', border:'1px solid var(--b2)',
            borderRadius:'var(--r3)', boxShadow:'var(--shadow2)', zIndex:10001, overflow:'hidden',
          }}>
            <div style={{ padding:'8px 12px', background:'var(--bg3)', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1 }}>
                السنوات المالية
              </span>
            </div>
            {openYears.length > 0 && (
              <>
                <div style={{ padding:'4px 12px 2px', fontSize:9, fontWeight:700, color:'var(--em)', textTransform:'uppercase', letterSpacing:1 }}>مفتوحة</div>
                {openYears.map(y => <YearOption key={y.id} year={y} selected={selectedYear?.id === y.id} onClick={() => { setSelectedYear(y); setOpen(false); }} />)}
              </>
            )}
            {closedYears.length > 0 && (
              <>
                <div style={{ padding:'6px 12px 2px', borderTop:'1px solid var(--b1)', fontSize:9, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1 }}>مقفلة</div>
                {closedYears.slice(0, 3).map(y => <YearOption key={y.id} year={y} selected={selectedYear?.id === y.id} onClick={() => { setSelectedYear(y); setOpen(false); }} />)}
                {closedYears.length > 3 && <div style={{ padding:'6px 12px', fontSize:11, color:'var(--t4)', fontStyle:'italic' }}>+ {closedYears.length - 3} سنوات أخرى...</div>}
              </>
            )}
            <div style={{ padding:'6px 12px', borderTop:'1px solid var(--b1)' }}>
              <a href="/fiscalyears" style={{ fontSize:12, color:'var(--em)', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }} onClick={() => setOpen(false)}>
                <i className="ti ti-settings" style={{ fontSize:13 }} />إدارة السنوات المالية
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function YearOption({ year, selected, onClick }: { year: FiscalYear; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer', transition:'.13s', background: selected ? 'var(--emb)' : 'transparent' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg3)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
      <i className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
         style={{ fontSize:14, color: year.is_closed ? 'var(--t4)' : year.is_current ? 'var(--gold)' : 'var(--em)', flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight: selected ? 700 : 500, color: selected ? 'var(--em)' : 'var(--t1)' }}>
          {year.name}
          {year.is_current && <span style={{ fontSize:9, color:'var(--gold)', marginRight:6 }}>★ حالية</span>}
        </div>
        <div style={{ fontSize:10, color:'var(--t4)' }}>{_fmt(year.start_date)} — {_fmt(year.end_date)}</div>
      </div>
      {selected && <i className="ti ti-check" style={{ color:'var(--em)', fontSize:14 }} />}
    </div>
  );
}

function _fmt(date: unknown): string {
  const d = String(date).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  if (!d) return '—';
  const [y, m] = d.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[parseInt(m) - 1]} ${y}`;
}
```

## FILE: resources/js/context/ThemeContext.tsx
```
```

## FILE: resources/js/context/useSetupWizard.ts
```
// ════════════════════════════════════════════════
// resources/js/context/useSetupWizard.ts
// الإصدار المُصلح: يعمل فقط بعد التوثيق
// ════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/core/client';
import { getAuthToken } from '@/lib/api/core/client';

const SETUP_KEY = 'setup_completed';

export function useSetupRequired() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // ❌ لا تفحص Setup قبل وجود token
    const token = getAuthToken();
    if (!token) {
      setNeedsSetup(false); // لا redirect للـ settings إذا لم يكن مسجل دخول
      return;
    }

    // ✅ إذا كان الـ setup مكتمل سابقاً
    if (localStorage.getItem(SETUP_KEY) === 'true') {
      setNeedsSetup(false);
      return;
    }

    // ✅ تحقق من الـ API بعد التوثيق
    Promise.allSettled([
      apiClient.get('/settings/key/company.name/value'),
      apiClient.get('/fiscal-years/current'),
    ]).then(([companyRes, fiscalRes]) => {
      const hasCompany =
        companyRes.status === 'fulfilled' &&
        !!companyRes.value?.data?.data?.value;

      const hasFiscalYear =
        fiscalRes.status === 'fulfilled' &&
        !!fiscalRes.value?.data?.data;

      const done = hasCompany && hasFiscalYear;

      if (done) localStorage.setItem(SETUP_KEY, 'true');

      setNeedsSetup(!done);
    }).catch(() => {
      // في حالة خطأ غير متوقع، لا نوجّه للـ setup
      setNeedsSetup(false);
    });
  }, []); // يعمل مرة واحدة عند التحميل

  const markComplete = () => {
    localStorage.setItem(SETUP_KEY, 'true');
    setNeedsSetup(false);
  };

  return { needsSetup, markComplete };
}
```



# =========================================
# 🔌 API / LIB
# =========================================

## FILE: resources/js/lib/api.ts
```
// ════════════════════════════════════════════════
// lib/api.ts — تصدير مركزي
// ════════════════════════════════════════════════

export { dashboardApi }                               from './api/dashboard';
export { productsApi, variantsApi }                   from './api/products';
export { invoicesApi, partiesApi, lookupsApi }        from './api/index';
export { default as apiClient }                       from './api/client';
export { setAuthToken, clearAuthToken, getAuthToken } from './api/client';

// للتوافق مع الكود القديم الذي يستخدم setToken / clearToken
export { setAuthToken as setToken, clearAuthToken as clearToken } from './api/client';

// default export للتوافق مع أي كود يستخدم: import api from '@/lib/api'
export { default } from './api/client';
```

## FILE: resources/js/lib/api/admin.ts
```
// lib/api/admin.ts — كل endpoints الـ Super Admin
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
import type {
  AdminCompany, AdminUser, AdminPlan, AdminStats, ActivityLog,
  PaginatedResponse, AdminCompaniesParams, AdminUsersParams,
  AdminActivityParams, SystemSettings,
} from '@/types/admin';

export const adminApi = {
  // Dashboard
  getDashboard:         ()                    => apiGet<AdminStats>('/admin/dashboard'),

  // Companies
  getCompanies:         (p?: AdminCompaniesParams) => apiGet<PaginatedResponse<AdminCompany>>('/admin/companies', p as Record<string, unknown>),
  getCompany:           (id: number)          => apiGet<AdminCompany>(`/admin/companies/${id}`),
  createCompany:        (data: Partial<AdminCompany> & { owner_id: number }) => apiPost<AdminCompany>('/admin/companies', data),
  updateCompany:        (id: number, data: Partial<AdminCompany>) => apiPut<AdminCompany>(`/admin/companies/${id}`, data),
  deleteCompany:        (id: number)          => apiDelete(`/admin/companies/${id}`),
  suspendCompany:       (id: number, reason: string) => apiPost(`/admin/companies/${id}/suspend`, { reason }),
  unsuspendCompany:     (id: number)          => apiPost(`/admin/companies/${id}/unsuspend`),
  activateCompany:      (id: number)          => apiPost(`/admin/companies/${id}/activate`),
  deactivateCompany:    (id: number)          => apiPost(`/admin/companies/${id}/deactivate`),
  verifyCompany:        (id: number)          => apiPost(`/admin/companies/${id}/verify`),
  unverifyCompany:      (id: number)          => apiPost(`/admin/companies/${id}/unverify`),
  changePlan:           (id: number, data: { plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) =>
                          apiPost(`/admin/companies/${id}/change-plan`, data),
  updateNotes:          (id: number, notes: string) => apiPatch(`/admin/companies/${id}/notes`, { notes }),
  getCompanyUsers:      (id: number, p?: Record<string, unknown>) => apiGet<PaginatedResponse<AdminUser>>(`/admin/companies/${id}/users`, p),
  addCompanyUser:       (companyId: number, userId: number, role?: string) =>
                          apiPost(`/admin/companies/${companyId}/users`, { user_id: userId, role }),
  removeCompanyUser:    (companyId: number, userId: number) => apiDelete(`/admin/companies/${companyId}/users/${userId}`),
  toggleCompanyUser:    (companyId: number, userId: number) => apiPatch(`/admin/companies/${companyId}/users/${userId}/toggle`),

  // Users
  getUsers:             (p?: AdminUsersParams) => apiGet<PaginatedResponse<AdminUser>>('/admin/users', p as Record<string, unknown>),
  getUser:              (id: number)           => apiGet<AdminUser>(`/admin/users/${id}`),
  createUser:           (data: { name: string; email: string; password: string; role?: string }) =>
                          apiPost<AdminUser>('/admin/users', data),
  updateUser:           (id: number, data: Partial<AdminUser>) => apiPut<AdminUser>(`/admin/users/${id}`, data),
  deleteUser:           (id: number)           => apiDelete(`/admin/users/${id}`),
  resetPassword:        (id: number, password: string, password_confirmation: string) =>
                          apiPost(`/admin/users/${id}/reset-password`, { password, password_confirmation }),
  toggleUserActive:     (id: number)           => apiPost(`/admin/users/${id}/toggle-active`),
  getUserCompanies:     (id: number)           => apiGet<AdminCompany[]>(`/admin/users/${id}/companies`),

  // Plans
  getPlans:             ()                     => apiGet<AdminPlan[]>('/admin/plans'),

  // Impersonate
  impersonateStart:     (userId: number)       => apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${userId}`),
  impersonateStop:      ()                     => apiPost('/admin/impersonate/stop'),

  // Activity Log
  getActivityLogs:      (p?: AdminActivityParams) => apiGet<PaginatedResponse<ActivityLog>>('/admin/activity-log', p as Record<string, unknown>),
  getActivityLog:       (id: number)           => apiGet<ActivityLog>(`/admin/activity-log/${id}`),
  exportActivityLogs:   (p?: AdminActivityParams) =>
                          apiGet('/admin/activity-log', { ...p as Record<string, unknown>, export: 'csv' }, { responseType: 'blob' }),

  // System Settings
  getSystemSettings:    ()                     => apiGet<SystemSettings>('/admin/settings'),
  updateSystemSettings: (data: Partial<SystemSettings>) => apiPut<SystemSettings>('/admin/settings', data),

  // Maintenance
  getMaintenanceStatus: ()                     => apiGet('/admin/maintenance'),
  enableMaintenance:    (message?: string)     => apiPost('/admin/maintenance/enable', { message }),
  disableMaintenance:   ()                     => apiPost('/admin/maintenance/disable'),
  clearCache:           ()                     => apiPost('/admin/maintenance/cache-clear'),
};
```

## FILE: resources/js/lib/api/client.ts
```
// ═══════════════════════════════════════════════════════
// lib/api/client.ts — Axios Instance المركزي
// ═══════════════════════════════════════════════════════
import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ── Constants ─────────────────────────────────────────
const BASE_URL          = '/api/v1';
const ACTIVE_COMPANY_KEY = 'active_company';
const TOKEN_KEY          = 'auth_token';

// ── ApiError ──────────────────────────────────────────
export interface ApiErrorPayload {
  message: string;
  code?:   string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code:   string,
    public readonly errors: Record<string, string[]>,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildApiError(status: number, payload?: ApiErrorPayload): ApiError {
  return new ApiError(
    status,
    payload?.code ?? 'UNKNOWN_ERROR',
    payload?.errors ?? {},
    payload?.message ?? 'حدث خطأ غير متوقع',
  );
}

// ── Token storage ─────────────────────────────────────
export const tokenStorage = {
  get:   () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set:   (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
};

export const setAuthToken   = (t: string) => tokenStorage.set(t);
export const clearAuthToken = ()          => tokenStorage.clear();
export const getAuthToken   = ()          => tokenStorage.get();

// ── Active company slug ───────────────────────────────
function getActiveSlug(): string | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
    return raw ? (JSON.parse(raw) as { slug?: string }).slug ?? null : null;
  } catch { return null; }
}

// ── Axios instance ────────────────────────────────────
const client: AxiosInstance = axios.create({
  baseURL:        BASE_URL,
  timeout:        30_000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ── Request interceptor ───────────────────────────────
// الـ routes على الباكاند: /{company}/{resource}
// نُضيف الـ slug تلقائياً لأي مسار تينانت

const GLOBAL_PREFIXES = ['/auth', '/admin', '/wilayas', '/communes', '/companies'];

function isTenantRoute(url: string): boolean {
  return !GLOBAL_PREFIXES.some(p => url.startsWith(p));
}

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const originalUrl = config.url ?? '';

    // إضافة slug للمسارات التينانت
    if (isTenantRoute(originalUrl) && !originalUrl.match(/^\/[^/]+\//)) {
      const slug = getActiveSlug();
      if (slug) {
        config.url = `/${slug}${originalUrl}`;
      } else if (import.meta.env.DEV) {
        console.warn(`⚠️ No active company for: ${config.method?.toUpperCase()} ${originalUrl}`);
      }
    }

    // Authorization header
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Slug header للتتبع
    const slug = getActiveSlug();
    if (slug) config.headers['X-Company-Slug'] = slug;

    // Upload timeout
    if (config.data instanceof FormData) config.timeout = 60_000;

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Queue للـ token refresh ───────────────────────────
let _isRefreshing = false;
const _failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  _failedQueue.splice(0).forEach(p => error ? p.reject(error) : p.resolve(token!));
}

function handleForcedLogout() {
  tokenStorage.clear();
  try {
    sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
    sessionStorage.removeItem('selected_fiscal_year');
  } catch {}
  const returnPath = window.location.pathname !== '/login'
    ? window.location.pathname + window.location.search
    : '/dashboard';
  window.location.href = `/login?return=${encodeURIComponent(returnPath)}`;
}

// ── Response interceptor ──────────────────────────────
client.interceptors.response.use(
  response => response,

  async (error: AxiosError<ApiErrorPayload>) => {
    const req    = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const data   = error.response?.data;

    if (status === 401) {
      if (req.url?.includes('/admin/'))        return Promise.reject(buildApiError(status, data));
      if (window.location.pathname === '/login') return Promise.reject(buildApiError(status, data));
      if (req._retry) { handleForcedLogout(); return Promise.reject(buildApiError(status, data)); }

      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => _failedQueue.push({ resolve, reject }))
          .then(token => { req.headers.Authorization = `Bearer ${token}`; return client(req); });
      }

      _isRefreshing  = true;
      req._retry     = true;

      try {
        throw new Error('token_rejected');
      } catch {
        processQueue(new Error('Session expired'), null);
        handleForcedLogout();
        return Promise.reject(buildApiError(401, { message: 'انتهت جلستك، يرجى تسجيل الدخول مجدداً' }));
      } finally {
        _isRefreshing = false;
      }
    }

    if (status === 403) {
      const code = data?.code;
      if (code === 'COMPANY_SUSPENDED' || code === 'COMPANY_INACTIVE') {
        try { sessionStorage.removeItem(ACTIVE_COMPANY_KEY); } catch {}
        if (window.location.pathname !== '/onboarding') window.location.href = '/onboarding';
      }
      return Promise.reject(buildApiError(status, data));
    }

    if (status === 422) return Promise.reject(buildApiError(status, data));
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      return Promise.reject(buildApiError(status, {
        message: `تجاوزت الحد المسموح. حاول بعد ${retryAfter ?? 60} ثانية.`,
        code: 'RATE_LIMITED',
      }));
    }
    if (status && status >= 500) return Promise.reject(buildApiError(status, {
      message: data?.message ?? 'خطأ في الخادم، يرجى المحاولة لاحقاً.', code: 'SERVER_ERROR',
    }));
    if (!error.response) return Promise.reject(buildApiError(0, {
      message: error.code === 'ECONNABORTED' ? 'انتهت مهلة الطلب.' : 'لا يوجد اتصال بالإنترنت.',
      code:    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
    }));

    return Promise.reject(buildApiError(status ?? 0, data));
  },
);

// ── extractData ───────────────────────────────────────
// يتعامل مع كل أشكال ردود Laravel بمرونة
function extractData<T>(response: { data: unknown }): T {
  const d = response?.data as Record<string, unknown> | unknown[] | null;

  if (Array.isArray(d)) return d as T;

  if (d && typeof d === 'object') {
    // غلاف { status|success|message + data }
    if (('status' in d || 'success' in d || 'message' in d) && 'data' in d) {
      const inner = (d as Record<string, unknown>).data;
      if (Array.isArray(inner)) return inner as T;
      if (inner && typeof inner === 'object' && 'data' in (inner as object))
        return (inner as Record<string, unknown>).data as T;
      return inner as T;
    }
    // Paginator { data, meta }
    if ('data' in d && 'meta' in d) return d as T;
    // { data: ... }
    if ('data' in d) return (d as Record<string, unknown>).data as T;
  }

  return (d ?? {}) as T;
}

// ── Typed wrappers ────────────────────────────────────
export interface LaravelResponse<T> { data: T; meta?: unknown; links?: unknown; }

// Request deduplication
const _pending = new Map<string, Promise<unknown>>();
function reqKey(method: string, url: string, params?: unknown) {
  return `${method}:${url}:${JSON.stringify(params ?? {})}`;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  const key      = reqKey('GET', url, params);
  const existing = _pending.get(key);
  if (existing) return existing as Promise<T>;

  const promise = client
    .get<LaravelResponse<T>>(url, { params, ...config })
    .then(res => extractData<T>(res))
    .finally(() => _pending.delete(key));

  _pending.set(key, promise);
  return promise;
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.post<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.put<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.patch<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<void> {
  await client.delete(url, config);
}

export async function apiUpload<T>(url: string, formData: FormData, onProgress?: (p: number) => void): Promise<T> {
  const res = await client.post<LaravelResponse<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    onUploadProgress: e => onProgress && e.total && onProgress(Math.round(e.loaded / e.total * 100)),
  });
  return extractData<T>(res);
}

// ── tenantApi factory ─────────────────────────────────
export function tenantApi(slug: string) {
  const prefix = (path: string) => `/${slug}/${path.replace(/^\//, '')}`;
  return {
    get:    <T>(path: string, params?: Record<string, unknown>) => apiGet<T>(prefix(path), params),
    post:   <T>(path: string, data?: unknown)                   => apiPost<T>(prefix(path), data),
    put:    <T>(path: string, data?: unknown)                   => apiPut<T>(prefix(path), data),
    patch:  <T>(path: string, data?: unknown)                   => apiPatch<T>(prefix(path), data),
    delete: (path: string)                                      => apiDelete(prefix(path)),
    upload: <T>(path: string, fd: FormData, cb?: (p: number) => void) => apiUpload<T>(prefix(path), fd, cb),
  };
}

export default client;
```

## FILE: resources/js/lib/api/dashboard.ts
```
// lib/api/dashboard.ts
import { apiGet } from './client';
import type { DashboardStats, SalesChartData, TopProduct, CommercialDocument } from '@/types';

export const dashboardApi = {
  getStats:         ()               => apiGet<DashboardStats>('/dashboard'),
  getSalesChart:    (period?: string)=> apiGet<SalesChartData>('/dashboard/sales-chart', { period }),
  getTopProducts:   (limit = 5)      => apiGet<TopProduct[]>('/dashboard/top-products', { limit }),
  getTopCustomers:  (limit = 5)      => apiGet<unknown[]>('/dashboard/top-customers', { limit }),
  getRecentInvoices:()               => apiGet<CommercialDocument[]>('/dashboard/recent-transactions'),
  getInventoryAlerts:()              => apiGet<unknown>('/dashboard/inventory'),
};
```

## FILE: resources/js/lib/api/index.ts
```
// ════════════════════════════════════════════════
// lib/api/invoices.ts
// ════════════════════════════════════════════════
import client from './client';
import type { CommercialDocument, PaginatedResponse } from '@/types';

export interface InvoiceFilters {
  search?: string;
  document_type_id?: number;
  party_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export const invoicesApi = {
  list:       (filters?: InvoiceFilters)               => client.get<PaginatedResponse<CommercialDocument>>('/commercial-documents', { params: filters }),
  get:        (id: number)                             => client.get<{ data: CommercialDocument }>(`/commercial-documents/${id}`),
  create:     (data: Partial<CommercialDocument>)      => client.post<{ data: CommercialDocument }>('/commercial-documents', data),
  update:     (id: number, data: Partial<CommercialDocument>) => client.put<{ data: CommercialDocument }>(`/commercial-documents/${id}`, data),
  delete:     (id: number)                             => client.delete(`/commercial-documents/${id}`),
  validate:   (id: number)                             => client.post(`/commercial-documents/${id}/validate`),
  lock:       (id: number)                             => client.post(`/commercial-documents/${id}/lock`),
  unlock:     (id: number)                             => client.post(`/commercial-documents/${id}/unlock`),
  cancel:     (id: number)                             => client.post(`/commercial-documents/${id}/cancel`),
  getUnpaid:  ()                                       => client.get<{ data: CommercialDocument[] }>('/commercial-documents/unpaid'),
  getOverdue: ()                                       => client.get<{ data: CommercialDocument[] }>('/commercial-documents/overdue'),
  getQRCode:  (id: number)                             => client.get(`/commercial-documents/${id}/qrcode`),
};


// ════════════════════════════════════════════════
// lib/api/parties.ts
// ════════════════════════════════════════════════
import type { Party, PaginatedResponse as PR } from '@/types';

export interface PartyFilters {
  search?: string;
  party_type_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
}

export const partiesApi = {
  list:          (filters?: PartyFilters) => client.get<PR<Party>>('/parties', { params: filters }),
  get:           (id: number)             => client.get<{ data: Party }>(`/parties/${id}`),
  create:        (data: Partial<Party>)   => client.post<{ data: Party }>('/parties', data),
  update:        (id: number, data: Partial<Party>) => client.put<{ data: Party }>(`/parties/${id}`, data),
  delete:        (id: number)             => client.delete(`/parties/${id}`),
  getCustomers:  (filters?: PartyFilters) => client.get<PR<Party>>('/customers', { params: filters }),
  getSuppliers:  (filters?: PartyFilters) => client.get<PR<Party>>('/suppliers', { params: filters }),
};


// ════════════════════════════════════════════════
// lib/api/lookups.ts — جداول البحث الثابتة
// ════════════════════════════════════════════════
import type { Unit, Tva, Family, Brand, PriceLevel, Warehouse, FiscalYear, Currency, DocumentType, PaymentMode, TreasuryAccount } from '@/types';

export const lookupsApi = {
  units:             () => client.get<{ data: Unit[] }>('/units'),
  tvas:              () => client.get<{ data: Tva[] }>('/tvas'),
  families:          () => client.get<{ data: Family[] }>('/families'),
  brands:            () => client.get<{ data: Brand[] }>('/brands'),
  priceLevels:       () => client.get<{ data: PriceLevel[] }>('/price-levels'),
  warehouses:        () => client.get<{ data: Warehouse[] }>('/warehouses'),
  fiscalYears:       () => client.get<{ data: FiscalYear[] }>('/fiscal-years'),
  currentFiscalYear: () => client.get<{ data: FiscalYear }>('/fiscal-years/current'),
  currencies:        () => client.get<{ data: Currency[] }>('/currencies'),
  documentTypes:     () => client.get<{ data: DocumentType[] }>('/document-types'),
  paymentModes:      () => client.get<{ data: PaymentMode[] }>('/payment-modes'),
  treasuryAccounts:  () => client.get<{ data: TreasuryAccount[] }>('/treasury-accounts'),
  documentStatuses:  () => client.get<{ data: unknown[] }>('/document-statuses'),
};


// ════════════════════════════════════════════════
// lib/api/index.ts — تصدير مركزي
// ════════════════════════════════════════════════
export { dashboardApi }             from './dashboard';
export { productsApi, variantsApi } from './products';
export { default as apiClient }     from './client';
// invoicesApi, partiesApi, lookupsApi مُصدَّرة بالفعل أعلاه بـ export const
```

## FILE: resources/js/lib/api/invoices.ts
```
// lib/api/invoices.ts
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { CommercialDocument, PaginatedResponse } from '@/types';
import type { InvoiceFilters } from '@/types/filters';

export const invoicesApi = {
  list:       (f?: InvoiceFilters)                => apiGet<PaginatedResponse<CommercialDocument>>('/documents',     f as Record<string, unknown>),
  get:        (id: number)                        => apiGet<CommercialDocument>(`/documents/${id}`),
  create:     (data: Partial<CommercialDocument>) => apiPost<CommercialDocument>('/documents', data),
  update:     (id: number, data: Partial<CommercialDocument>) => apiPut<CommercialDocument>(`/documents/${id}`, data),
  delete:     (id: number)                        => apiDelete(`/documents/${id}`),
  validate:   (id: number)                        => apiPost(`/documents/${id}/validate`),
  lock:       (id: number)                        => apiPost(`/documents/${id}/lock`),
  unlock:     (id: number)                        => apiPost(`/documents/${id}/unlock`),
  cancel:     (id: number)                        => apiPost(`/documents/${id}/cancel`),
  duplicate:  (id: number)                        => apiPost<CommercialDocument>(`/documents/${id}/duplicate`),
  getUnpaid:  ()                                  => apiGet<PaginatedResponse<CommercialDocument>>('/documents/unpaid'),
  getOverdue: ()                                  => apiGet<PaginatedResponse<CommercialDocument>>('/documents/overdue'),
  getQRCode:  (id: number)                        => apiGet(`/documents/${id}/qrcode`),
};
```

## FILE: resources/js/lib/api/lookups.ts
```
// lib/api/lookups.ts
import { apiGet } from './client';
import type {
  Unit, Tva, Family, Brand, PriceLevel, Warehouse, Currency,
  DocumentType, DocumentStatus, PaymentMode, TreasuryAccount,
  FiscalYear, Gender, Wilaya, Commune,
} from '@/types';

export const lookupsApi = {
  units:                () => apiGet<Unit[]>('/units',                  { per_page: 50 }),
  tvas:                 () => apiGet<Tva[]>('/tvas',                    { per_page: 50 }),
  families:             () => apiGet<Family[]>('/families',             { per_page: 100 }),
  brands:               () => apiGet<Brand[]>('/brands',               { per_page: 100 }),
  currencies:           () => apiGet<Currency[]>('/currencies'),
  priceLevels:          () => apiGet<PriceLevel[]>('/price-levels',    { per_page: 50 }),
  warehouses:           () => apiGet<Warehouse[]>('/warehouses',       { per_page: 50 }),
  paymentModes:         () => apiGet<PaymentMode[]>('/payment-modes',  { per_page: 50 }),
  documentTypes:        () => apiGet<DocumentType[]>('/document-types',{ per_page: 50 }),
  documentStatuses:     () => apiGet<DocumentStatus[]>('/document-statuses'),
  expenseCategories:    () => apiGet<any[]>('/expense-categories'),
  productTypes:         () => apiGet<any[]>('/product-types',          { per_page: 50 }),
  treasuryAccounts:     () => apiGet<TreasuryAccount[]>('/treasury-accounts'),
  treasuryAccountTypes: () => apiGet<any[]>('/treasury-account-types'),
  valuationMethods:     () => apiGet<any[]>('/inventory-valuation-methods'),
  genders:              () => apiGet<Gender[]>('/genders'),
  legalForms:           () => apiGet<any[]>('/legal-forms'),
  partyTypes:           () => apiGet<any[]>('/party-types'),
  stockMovementTypes:   () => apiGet<any[]>('/stock-movement-types'),
  fiscalYears:          () => apiGet<FiscalYear[]>('/fiscal-years',    { per_page: 50 }),
  currentFiscalYear:    () => apiGet<FiscalYear>('/fiscal-years/current'),
  wilayas:              () => apiGet<Wilaya[]>('/wilayas',             { per_page: 500 }),
  communes:             (wilayaId?: number) =>
    wilayaId
      ? apiGet<Commune[]>(`/communes/by-wilaya/${wilayaId}`)
      : apiGet<Commune[]>('/communes', { per_page: 1600 }),
};
```

## FILE: resources/js/lib/api/parties.ts
```
// lib/api/parties.ts
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Party, PaginatedResponse } from '@/types';
import type { PartyFilters } from '@/types/filters';

export const partiesApi = {
  list:         (f?: PartyFilters) => apiGet<PaginatedResponse<Party>>('/parties',   f as Record<string, unknown>),
  get:          (id: number)       => apiGet<Party>(`/parties/${id}`),
  create:       (data: Partial<Party>) => apiPost<Party>('/parties', data),
  update:       (id: number, data: Partial<Party>) => apiPut<Party>(`/parties/${id}`, data),
  delete:       (id: number)       => apiDelete(`/parties/${id}`),
  getCustomers: (f?: PartyFilters) => apiGet<PaginatedResponse<Party>>('/customers', f as Record<string, unknown>),
  getSuppliers: (f?: PartyFilters) => apiGet<PaginatedResponse<Party>>('/suppliers', f as Record<string, unknown>),
};
```

## FILE: resources/js/lib/api/products.ts
```
// lib/api/products.ts
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Product, ProductVariant, PaginatedResponse } from '@/types';
import type { ProductFilters, VariantFilters } from '@/types/filters';

export const productsApi = {
  list:       (f?: ProductFilters) => apiGet<PaginatedResponse<Product>>('/products', f as Record<string, unknown>),
  get:        (id: number)         => apiGet<Product>(`/products/${id}`, { include: 'family,brand,unit,tva,variants' }),
  create:     (data: Partial<Product>) => apiPost<Product>('/products', data),
  update:     (id: number, data: Partial<Product>) => apiPut<Product>(`/products/${id}`, data),
  delete:     (id: number)         => apiDelete(`/products/${id}`),
  getActive:  ()                   => apiGet<Product[]>('/products/active'),
  byFamily:   (id: number)         => apiGet<Product[]>(`/products/by-family/${id}`),
  byBrand:    (id: number)         => apiGet<Product[]>(`/products/by-brand/${id}`),
};

export const variantsApi = {
  list:         (f?: VariantFilters)  => apiGet<PaginatedResponse<ProductVariant>>('/product-variants', f as Record<string, unknown>),
  get:          (id: number)          => apiGet<ProductVariant>(`/product-variants/${id}`),
  byProduct:    (productId: number)   => apiGet<ProductVariant[]>(`/products/${productId}/variants`),
  create:       (data: Partial<ProductVariant>) => apiPost<ProductVariant>('/product-variants', data),
  update:       (id: number, data: Partial<ProductVariant>) => apiPut<ProductVariant>(`/product-variants/${id}`, data),
  delete:       (id: number)          => apiDelete(`/product-variants/${id}`),
  getLowStock:  ()                    => apiGet<ProductVariant[]>('/product-variants/low-stock'),
  byBarcode:    (barcode: string)     => apiGet<ProductVariant[]>('/product-variants', { barcode }),
};
```

## FILE: resources/js/lib/queryKeys.ts
```
// ═══════════════════════════════════════════════════════
// lib/queryKeys.ts — مصدر الحقيقة الوحيد لكل Query Keys
// ═══════════════════════════════════════════════════════
import type { InvoiceFilters, PartyFilters, ProductFilters, VariantFilters } from '@/types/filters';
import type { AdminCompaniesParams, AdminUsersParams, AdminActivityParams } from '@/types/admin';

// ── Lookup keys (بيانات عالمية) ───────────────────────
export const lookupKeys = {
  all:                  ['lookups'] as const,
  units:                () => ['lookups', 'units']                   as const,
  tvas:                 () => ['lookups', 'tvas']                    as const,
  families:             () => ['lookups', 'families']                as const,
  brands:               () => ['lookups', 'brands']                  as const,
  currencies:           () => ['lookups', 'currencies']              as const,
  priceLevels:          () => ['lookups', 'price-levels']            as const,
  warehouses:           () => ['lookups', 'warehouses']              as const,
  paymentModes:         () => ['lookups', 'payment-modes']           as const,
  documentTypes:        () => ['lookups', 'document-types']          as const,
  documentStatuses:     () => ['lookups', 'document-statuses']       as const,
  expenseCategories:    () => ['lookups', 'expense-categories']      as const,
  productTypes:         () => ['lookups', 'product-types']           as const,
  treasuryAccounts:     () => ['lookups', 'treasury-accounts']       as const,
  treasuryAccountTypes: () => ['lookups', 'treasury-account-types']  as const,
  valuationMethods:     () => ['lookups', 'valuation-methods']       as const,
  genders:              () => ['lookups', 'genders']                 as const,
  legalForms:           () => ['lookups', 'legal-forms']             as const,
  partyTypes:           () => ['lookups', 'party-types']             as const,
  stockMovementTypes:   () => ['lookups', 'stock-movement-types']    as const,
  wilayas:              () => ['lookups', 'wilayas']                 as const,
  communes:             (wilayaId?: number) => ['lookups', 'communes', wilayaId ?? 'all'] as const,
} as const;

// ── Tenant keys (مُقيَّدة بـ slug الشركة) ─────────────
export const tenantKeys = {
  fiscalYears: (slug: string) => ['fiscal-years', slug] as const,

  invoices: {
    all:    (slug: string)                       => ['invoices', slug]              as const,
    list:   (slug: string, f: InvoiceFilters)    => ['invoices', slug, 'list', f]   as const,
    detail: (slug: string, id: number)           => ['invoices', slug, id]          as const,
  },

  parties: {
    all:       (slug: string)                    => ['parties', slug]               as const,
    customers: (slug: string, f: PartyFilters)   => ['parties', slug, 'customers', f] as const,
    suppliers: (slug: string, f: PartyFilters)   => ['parties', slug, 'suppliers', f] as const,
    detail:    (slug: string, id: number)        => ['parties', slug, id]           as const,
  },

  products: {
    all:      (slug: string)                     => ['products', slug]              as const,
    list:     (slug: string, f: ProductFilters)  => ['products', slug, 'list', f]  as const,
    detail:   (slug: string, id: number)         => ['products', slug, 'detail', id] as const,
    active:   (slug: string)                     => ['products', slug, 'active']   as const,
    byFamily: (slug: string, id: number)         => ['products', slug, 'by-family', id] as const,
    byBrand:  (slug: string, id: number)         => ['products', slug, 'by-brand', id]  as const,
  },

  variants: {
    all:      (slug: string)                     => ['variants', slug]              as const,
    list:     (slug: string, f: VariantFilters)  => ['variants', slug, 'list', f]  as const,
    detail:   (slug: string, id: number)         => ['variants', slug, 'detail', id] as const,
    lowStock: (slug: string)                     => ['variants', slug, 'low-stock'] as const,
    barcode:  (slug: string, bc: string)         => ['variants', slug, 'barcode', bc] as const,
  },

  dashboard: {
    stats:        (slug: string)            => ['dashboard', slug, 'stats']          as const,
    chart:        (slug: string, p: string) => ['dashboard', slug, 'chart', p]       as const,
    topProducts:  (slug: string)            => ['dashboard', slug, 'top-products']   as const,
    topCustomers: (slug: string)            => ['dashboard', slug, 'top-customers']  as const,
    recent:       (slug: string)            => ['dashboard', slug, 'recent']         as const,
    inventory:    (slug: string)            => ['dashboard', slug, 'inventory']      as const,
  },
} as const;

// ── Admin keys ────────────────────────────────────────
export const adminKeys = {
  all:          ['admin']                                                as const,
  dashboard:    ()                          => ['admin', 'dashboard']   as const,
  companies:    (p?: AdminCompaniesParams)  => ['admin', 'companies', p ?? {}] as const,
  company:      (id: number)                => ['admin', 'company', id] as const,
  companyUsers: (id: number)                => ['admin', 'company-users', id] as const,
  users:        (p?: AdminUsersParams)      => ['admin', 'users', p ?? {}] as const,
  user:         (id: number)                => ['admin', 'user', id]    as const,
  plans:        ()                          => ['admin', 'plans']       as const,
  activity:     (p?: AdminActivityParams)   => ['admin', 'activity', p ?? {}] as const,
  settings:     ()                          => ['admin', 'settings']    as const,
} as const;
```

## FILE: resources/js/lib/utils.ts
```
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'DZD'): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'حدث خطأ غير متوقع';
}```



# =========================================
# 📘 TYPES
# =========================================

## FILE: resources/js/types/admin.ts
```
// ════════════════════════════════════════════════
// types/admin.ts — النسخة الكاملة
// ════════════════════════════════════════════════

export interface AdminCompany {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: string;
  active: boolean;          // is_active من Laravel Resource
  is_suspended: boolean;
  suspended_reason?: string;
  suspended_at?: string;
  verified_at?: string | null;
  notes?: string;
  users_count: number;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  trial_ends_at?: string | null;
  on_trial?: boolean;
  owner?: { id: number; name: string; email: string };
  created_at: string;
  updated_at?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;          // is_active من Laravel Resource
  companies_count?: number;
  avatar?: string;
  phone?: string;
  last_login_at?: string;
  created_at: string;
}

export interface AdminStats {
  companies: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
    verified: number;
    on_trial?: number;
    by_plan: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    new_this_month: number;
    new_today?: number;
  };
  recent_companies: AdminCompany[];
  recent_users: AdminUser[];
}

export interface AdminPlan {
  key: string;
  label: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  companies_count?: number;
  price?: number;
  features?: string[];
}

export interface ActivityLog {
  id: number;
  event: string;
  description: string;
  causer?: { id: number; name: string; email: string };
  subject_type?: string;
  subject_id?: number;
  company?: { id: number; name: string };
  ip_address?: string;
  user_agent?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

export interface SystemSettings {
  allow_registration: boolean;
  allow_new_companies: boolean;
  debug_mode: boolean;
  public_api: boolean;
  free_trial_days: number;
  free_max_users: number;
  starter_max_products: number;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
  };
}

export interface AdminCompaniesParams {
  search?: string;
  status?: 'active' | 'suspended' | 'inactive' | 'verified' | 'unverified';
  plan?: string;
  page?: number;
  per_page?: number;
  sort?: string;
}

export interface AdminUsersParams {
  search?: string;
  role?: string;
  active?: string;
  page?: number;
  per_page?: number;
}

export interface AdminActivityParams {
  search?: string;
  event?: string;
  date_from?: string;
  date_to?: string;
  causer_id?: number;
  company_id?: number;
  page?: number;
  per_page?: number;
}
```

## FILE: resources/js/types/filters.ts
```
// types/filters.ts — فلاتر الاستعلام لكل كيان
export interface InvoiceFilters {
  search?:           string;
  document_type_id?: number;
  party_id?:         number;
  status?:           string;
  date_from?:        string;
  date_to?:          string;
  page?:             number;
  per_page?:         number;
  sort?:             string;
}

export interface PartyFilters {
  search?:        string;
  party_type_id?: number;
  active?:        boolean;
  page?:          number;
  per_page?:      number;
  sort?:          string;
}

export interface ProductFilters {
  search?:          string;
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
  page?:            number;
  per_page?:        number;
  sort?:            string;
  include?:         string;
}

export interface VariantFilters {
  search?:     string;
  barcode?:    string;
  product_id?: number;
  page?:       number;
  per_page?:   number;
}
```

## FILE: resources/js/types/index.ts
```
// ════════════════════════════════════════════════
// types/index.ts — أنواع TypeScript المتكاملة
// مطابقة لقاعدة البيانات
// ════════════════════════════════════════════════

// ── Common ────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  links: { first: string; last: string; prev: string | null; next: string | null };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface SelectOption {
  value: number | string;
  label: string;
}

// ── Auth ──────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  roles?: Role[];
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ── Lookup Tables ─────────────────────────────────
export interface Unit {
  id: number;
  name: string;
  symbol: string | null;
  description: string | null;
  active: boolean;
  display_order: number;
}

export interface Tva {
  id: number;
  name: string;
  rate: number;
  description: string | null;
  active: boolean;
  is_default: boolean;
  display_order: number;
}

export interface Family {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  parent_id: number | null;
  parent?: Family;
  children?: Family[];
  active: boolean;
  display_order: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  active: boolean;
  display_order: number;
}

export interface PriceLevel {
  id: number;
  name: string;
  description: string | null;
  is_percentage: boolean;
  value: number;
  active: boolean;
  display_order: number;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  active: boolean;
  is_default: boolean;
}

export interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  display_name: string | null;
  group: string | null;
  description: string | null;
}

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  is_default: boolean;
  active: boolean;
}

export interface DocumentType {
  id: number;
  name: string;
  name_latin: string;
  code: string;
  description: string | null;
  affects_stock_direction: -1 | 0 | 1;
  requires_party: boolean;
  affects_accounting: boolean;
  active: boolean;
}

export interface DocumentStatus {
  id: number;
  name: string;
  label: string;
  color: string | null;
  is_final: boolean;
}

export interface PaymentMode {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  type: 'bank' | 'cash';
  balance: number;
  is_default: boolean;
  active: boolean;
}

// ── Product ───────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number;
  images: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // relations
  family?: Family;
  brand?: Brand;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  ref: string | null;
  barcode: string | null;
  variant_name: string | null;
  unit_id: number | null;
  tva_id: number | null;
  last_purchase_price: number;
  average_cost_price: number;
  default_selling_price_ht: number;
  manages_stock: boolean;
  allow_negative_stock: boolean;
  has_lots: boolean;
  min_stock_alert: number;
  max_stock_alert: number;
  active: boolean;
  // relations
  product?: Product;
  unit?: Unit;
  tva?: Tva;
  variant_prices?: ProductVariantPrice[];
  // computed
  current_stock?: number;
  selling_price_ttc?: number;
}

export interface ProductVariantPrice {
  id: number;
  product_id: number;
  price_level_id: number;
  price: number;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  price_level?: PriceLevel;
}

// ── Party (Client / Supplier) ─────────────────────
export interface Party {
  id: number;
  party_type_id: number;
  code: string | null;
  name: string;
  commercial_name: string | null;
  slug: string;
  nif: string | null;
  nis: string | null;
  ai: string | null;
  rc: string | null;
  address: string | null;
  wilaya_id: number | null;
  commune_id: number | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  initial_balance: number;
  credit_limit: number;
  credit_days: number | null;
  default_price_level_id: number | null;
  is_tva_exempt: boolean;
  active: boolean;
  created_at: string;
  // relations
  party_type?: { id: number; name: string; code: string };
  default_price_level?: PriceLevel;
  // computed
  balance?: number;
  total_purchases?: number;
}

// ── Commercial Document ───────────────────────────
export type DocumentStatusValue = 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocument {
  id: number;
  document_type_id: number;
  document_number: string;
  party_id: number | null;
  warehouse_id: number;
  fiscal_year_id: number;
  document_date: string;
  due_date: string | null;
  status: DocumentStatusValue;
  notes: string | null;
  // Amounts
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discount: number;
  fiscal_stamp: number;
  amount_paid: number;
  amount_remaining: number;
  // Relations
  document_type?: DocumentType;
  party?: Party;
  warehouse?: Warehouse;
  lines?: CommercialDocumentLine[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface CommercialDocumentLine {
  id: number;
  commercial_document_id: number;
  product_id: number;
  description: string | null;
  quantity: number;
  unit_price_ht: number;
  discount_percentage: number;
  discount_amount: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  line_order: number;
  // Relations
  product_variant?: ProductVariant;
}

// ── Payment ───────────────────────────────────────
export interface Payment {
  id: number;
  commercial_document_id: number;
  payment_mode_id: number;
  treasury_account_id: number | null;
  amount: number;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  // Relations
  payment_mode?: PaymentMode;
  treasury_account?: TreasuryAccount;
}

// ── Stock ─────────────────────────────────────────
export interface StockMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  fiscal_year_id: number;
  stock_movement_type_id: number;
  movement_date: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
  notes: string | null;
  // Relations
  product_variant?: ProductVariant;
  warehouse?: Warehouse;
}

// ── Expense ───────────────────────────────────────
export interface Expense {
  id: number;
  expense_category_id: number;
  party_id: number | null;
  amount: number;
  amount_paid: number;
  expense_date: string;
  due_date: string | null;
  description: string;
  status: 'unpaid' | 'partial' | 'paid';
  payment_mode_id: number | null;
  reference: string | null;
  // Relations
  expense_category?: { id: number; name: string };
  party?: Party;
}

// ── Employee ──────────────────────────────────────
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  hire_date: string;
  active: boolean;
  // computed
  full_name?: string;
}

// ── Dashboard ─────────────────────────────────────
export interface DashboardStats {
  today_sales: number;
  month_sales: number;
  month_invoices_count: number;
  pending_invoices: number;
  new_clients_month: number;
  total_clients: number;
  low_stock_count: number;
  out_of_stock_count: number;
  month_profit: number;
  profit_margin: number;
  month_tva_collected: number;
  month_tva_deductible: number;
  tva_due: number;
  total_debts: number;
  debtors_count: number;
}

export interface SalesChartData {
  labels: string[];
  data: number[];
  min: number;
  max: number;
  average: number;
}

export interface TopProduct {
  id: number;
  name: string;
  quantity_sold: number;
  revenue: number;
  percentage: number;
}

// ── POS (Cart) ────────────────────────────────────
export interface CartItem {
  id: string;                    // unique cart item id
  product_id: number;
  product_name: string;
  variant_name: string | null;
  barcode: string | null;
  unit_symbol: string | null;
  quantity: number;
  unit_price_ht: number;
  selling_price_ttc: number;
  tva_rate: number;
  discount_percentage: number;
  discount_amount: number;
  total_ht: number;
  total_ttc: number;
  max_stock: number | null;      // null = no stock limit
}

export interface CartTotals {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discount: number;
  fiscal_stamp: number;
  items_count: number;
  lines_count: number;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  totals: CartTotals;
  client?: Party | null;
  created_at: string;
}

// ── Notification ─────────────────────────────────
export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ── Settings ──────────────────────────────────────
export interface Setting {
  id: number;
  key: string;
  value: string | null;
  group: string | null;
  type: 'string' | 'integer' | 'boolean' | 'json';
  label: string | null;
  description: string | null;
}
```

## FILE: resources/js/types/product.ts
```
// types/product.ts
export interface Family { id: number; name: string; }
export interface Brand { id: number; name: string; }
export interface ProductType { id: number; name: string; label: string; manages_stock: boolean; }
export interface Unit { id: number; name: string; symbol: string; }
export interface TvaRate { id: number; rate: number; is_default?: boolean; }
export interface PriceLevel { id: number; name: string; }
export interface InventoryValuationMethod { id: number; name: string; method: 'FIFO' | 'LIFO' | 'AVERAGE'; }
export interface Warehouse { id: number; name: string; }
export interface ProductVariantPrice { price_level_id: number; price: number | null; valid_from?: string | null; valid_to?: string | null; active: boolean; }
export interface QuantityDiscount { min_quantity: number; max_quantity?: number | null; discount_percentage?: number | null; discount_per_unit?: number | null; tier_order: number; active: boolean; }
export interface ProductLot { lot_number: string; supplier_lot_number?: string | null; warehouse_id: number | null; manufacturing_date?: string | null; expiration_date?: string | null; purchase_date?: string | null; purchase_price: number | null; legal_selling_price?: number | null; margin_percentage?: number | null; original_quantity: number; remaining_quantity?: number; active?: boolean; }
export interface ProductVariant {
  id?: number; ref: string; barcode?: string | null; variant_name?: string | null;
  unit_id: number | null; tva_id: number | null;
  weight?: number | null; volume?: number | null; length?: number | null; width?: number | null; height?: number | null;
  variant_attributes?: Record<string, string>;
  default_selling_price_ht: number; last_purchase_price?: number | null; average_cost_price?: number | null;
  manages_stock: boolean; allow_negative_stock: boolean; has_lots: boolean; has_expiration_date: boolean;
  min_stock_alert?: number | null; max_stock_alert?: number | null; manages_quantity_discounts: boolean;
  valuation_method_id?: number | null; active: boolean;
  prices: ProductVariantPrice[]; quantity_discounts: QuantityDiscount[]; lots?: ProductLot[];
}
export interface Product {
  id: number; name: string; slug: string; description?: string | null;
  family_id?: number | null; brand_id?: number | null; product_type_id?: number | null;
  specifications?: Record<string, string>; images?: string[] | null;
  meta_title?: string | null; meta_description?: string | null; meta_keywords?: string[] | null; active: boolean;
  variants?: ProductVariant[];
  family?: Family; brand?: Brand; productType?: ProductType;
}
```



# =========================================
# ⚙️ CONFIG
# =========================================

## FILE: resources/js/config/navigation.ts
```
// ════════════════════════════════════════════════
// config/navigation.ts — تهيئة التنقل المركزي
// ════════════════════════════════════════════════

export interface NavItem {
  id:        string;
  label:     string;
  href:      string;
  icon:      string;
  badge?:    number;
  badgeWarn?: boolean;
}

export interface NavGroup {
  label:     string;
  color:     string;        // CSS var
  items:     NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'الرئيسية',
    color: 'var(--em)',
    items: [
      { id:'dashboard', label:'لوحة التحكم', href:'/dashboard',     icon:'ti-layout-dashboard' },
      { id:'pos',       label:'نقطة البيع',  href:'/pos',           icon:'ti-shopping-cart'    },
    ],
  },
  {
    label: 'المبيعات',
    color: 'var(--blue)',
    items: [
      { id:'invoices',   label:'الفواتير',        href:'/invoices',    icon:'ti-file-text',     badge: 3  },
      { id:'orders',     label:'طلبيات الشراء',   href:'/orders',      icon:'ti-clipboard-list'           },
      { id:'returns',    label:'المرتجعات',        href:'/returns',     icon:'ti-corner-up-left'           },
      { id:'quotations', label:'عروض الأسعار',     href:'/quotations',  icon:'ti-file-check'               },
      { id:'bl',         label:'وصل التسليم BL',   href:'/bl',          icon:'ti-truck'                    },
    ],
  },
  {
    label: 'المخزون',
    color: 'var(--purple)',
    items: [
      { id:'products',   label:'المنتجات',       href:'/products',    icon:'ti-package'                       },
      { id:'inventory',  label:'إدارة المخزون',  href:'/inventory',   icon:'ti-building-warehouse', badgeWarn:true },
      { id:'categories', label:'الفئات',          href:'/categories',  icon:'ti-folder-open'                   },
      { id:'brands',     label:'العلامات',        href:'/brands',      icon:'ti-award'                         },
      { id:'units',      label:'الوحدات',         href:'/units',       icon:'ti-ruler'                         },
      { id:'suppliers',  label:'الموردون',        href:'/suppliers',   icon:'ti-truck'                         },
      { id:'warehouses', label:'المستودعات',      href:'/warehouses',  icon:'ti-building-warehouse'            },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    color: 'var(--gold)',
    items: [
      { id:'clients',     label:'العملاء',            href:'/clients',     icon:'ti-users'           },
      { id:'finance',     label:'الخزينة',             href:'/finance',     icon:'ti-building-bank'   },
      { id:'expenses',    label:'المصروفات',           href:'/expenses',    icon:'ti-credit-card'     },
      { id:'debts',       label:'الديون',              href:'/debts',       icon:'ti-receipt'         },
      { id:'tva',         label:'إقرار TVA — G50',    href:'/tva',         icon:'ti-calculator'      },
      { id:'fiscal',      label:'الملف الجبائي',       href:'/fiscal',      icon:'ti-file-barcode'    },
      { id:'fiscalyears', label:'السنوات المالية',     href:'/fiscalyears', icon:'ti-calendar'        },
      { id:'currencies',  label:'العملات',             href:'/currencies',  icon:'ti-currency-dollar' },
      { id:'pricelevels', label:'مستويات الأسعار',     href:'/pricelevels', icon:'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    color: 'var(--orange)',
    items: [
      { id:'reports', label:'التقارير والإحصائيات', href:'/reports', icon:'ti-chart-bar' },
      { id:'balance', label:'الميزانية التقديرية',   href:'/balance', icon:'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    color: 'var(--teal)',
    items: [
      { id:'employees', label:'الموظفون',   href:'/employees', icon:'ti-id-badge' },
      { id:'users',     label:'المستخدمون', href:'/users',     icon:'ti-user'     },
      { id:'settings',  label:'الإعدادات',  href:'/settings',  icon:'ti-settings' },
    ],
  },
];

// ── Flat map for title/breadcrumb lookup ──────────
export const PAGE_META = Object.fromEntries(
  NAV_GROUPS.flatMap(g => g.items.map(item => [
    item.href,
    { title: item.label, path: `${g.label} ← ${item.label}` }
  ]))
);
PAGE_META['/dashboard'] = { title: 'لوحة التحكم', path: 'الرئيسية ← إحصائيات' };
PAGE_META['/pos']       = { title: 'نقطة البيع',  path: 'الرئيسية ← POS'       };


// ════════════════════════════════════════════════
// routes/index.tsx — تعريف الروابط المركزي
// ════════════════════════════════════════════════
import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Lazy load pages for code splitting
const LoginPage     = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
// TODO: add as you build them
// const ProductsPage  = lazy(() => import('@/pages/products/ProductsPage'));
// const POSPage       = lazy(() => import('@/pages/pos/POSPage'));
// const InvoicesPage  = lazy(() => import('@/pages/invoices/InvoicesPage'));

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg0)' }}>
      <span className="ic ic-xl" style={{ color:'var(--em)' }}>
        <i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} />
      </span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Placeholder for unbuilt pages
function ComingSoon() {
  return (
    <div className="page on">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="empty-ic"><i className="ti ti-hammer" /></div>
        <div className="empty-tx">هذه الصفحة قيد الإنشاء</div>
        <div className="empty-sub">سيتم إضافتها قريباً</div>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          {/* Add real pages as you build them */}
          <Route path="pos"         element={<ComingSoon />} />
          <Route path="invoices"    element={<ComingSoon />} />
          <Route path="products"    element={<ComingSoon />} />
          <Route path="inventory"   element={<ComingSoon />} />
          <Route path="clients"     element={<ComingSoon />} />
          <Route path="suppliers"   element={<ComingSoon />} />
          <Route path="finance"     element={<ComingSoon />} />
          <Route path="expenses"    element={<ComingSoon />} />
          <Route path="debts"       element={<ComingSoon />} />
          <Route path="tva"         element={<ComingSoon />} />
          <Route path="fiscal"      element={<ComingSoon />} />
          <Route path="fiscalyears" element={<ComingSoon />} />
          <Route path="reports"     element={<ComingSoon />} />
          <Route path="balance"     element={<ComingSoon />} />
          <Route path="users"       element={<ComingSoon />} />
          <Route path="settings"    element={<ComingSoon />} />
          <Route path="employees"   element={<ComingSoon />} />
          <Route path="categories"  element={<ComingSoon />} />
          <Route path="brands"      element={<ComingSoon />} />
          <Route path="units"       element={<ComingSoon />} />
          <Route path="warehouses"  element={<ComingSoon />} />
          <Route path="currencies"  element={<ComingSoon />} />
          <Route path="pricelevels" element={<ComingSoon />} />
          <Route path="orders"      element={<ComingSoon />} />
          <Route path="returns"     element={<ComingSoon />} />
          <Route path="quotations"  element={<ComingSoon />} />
          <Route path="bl"          element={<ComingSoon />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
```



# =========================================
# 🚀 ROOT FILES
# =========================================

## FILE: resources/js/app.jsx
```
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

## FILE: resources/js/App.tsx
```
// ════════════════════════════════════════════════
// App.tsx — نقطة الدخول الرئيسية
// ════════════════════════════════════════════════
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FiscalYearProvider } from "@/context/FiscalYearContext";
import { AuthProvider } from "@/context/AuthContext";
import AppRoutes from "@/routes/index";

// CSS — الترتيب مهم جداً
import "../css/theme/tokens.css";
import "../css/theme/layout.css";
import "../css/theme/components.css";
import "../css/theme/pages.css";
import "../css/theme/utilities.css";
import "../css/theme/pos.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,          // ⭐ لا تُعد الجلب عند كل تنقل بين الصفحات
      retry: 1,
      staleTime: 10 * 60 * 1000,     // 10 دقائق بدلاً من 30 ثانية
      cacheTime: 30 * 60 * 1000,     // احتفظ بالبيانات في الكاش لمدة نصف ساعة
    },
  },
});

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <FiscalYearProvider>
                    <BrowserRouter>
                        <AppRoutes />
                    </BrowserRouter>
                </FiscalYearProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
```

## FILE: resources/js/bootstrap.js
```
import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
```

