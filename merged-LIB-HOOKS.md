

# =========================================
# 🧠 HOOKS
# =========================================

## FILE: resources/js/hooks/useAdmin.ts
```
// ════════════════════════════════════════════════
// hooks/useAdmin.ts — النسخة الكاملة
// متوافقة مع ردود Backend الفعلية
// ════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type {
  AdminCompany, AdminUser, AdminPlan, AdminStats,
  ActivityLog, PaginatedResponse, SystemSettings,
  AdminCompaniesParams, AdminUsersParams, AdminActivityParams,
} from '@/types/admin';

// ── Query Keys ────────────────────────────────────────────────
export const adminKeys = {
  all:          ['admin'] as const,
  dashboard:    ()                       => [...adminKeys.all, 'dashboard'] as const,
  companies:    (p?: AdminCompaniesParams) => [...adminKeys.all, 'companies', p ?? {}] as const,
  company:      (id: number)             => [...adminKeys.all, 'company', id] as const,
  companyUsers: (id: number)             => [...adminKeys.all, 'company-users', id] as const,
  users:        (p?: AdminUsersParams)   => [...adminKeys.all, 'users', p ?? {}] as const,
  user:         (id: number)             => [...adminKeys.all, 'user', id] as const,
  plans:        ()                       => [...adminKeys.all, 'plans'] as const,
  activity:     (p?: AdminActivityParams) => [...adminKeys.all, 'activity', p ?? {}] as const,
  settings:     ()                       => [...adminKeys.all, 'settings'] as const,
};

// ── Dashboard ─────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.dashboard(),
    queryFn:  adminApi.getDashboard,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Companies ─────────────────────────────────────────────────
export function useAdminCompanies(params?: AdminCompaniesParams) {
  return useQuery<PaginatedResponse<AdminCompany>>({
    queryKey: adminKeys.companies(params),
    queryFn:  () => adminApi.getCompanies(params),
    staleTime: 60_000,
    keepPreviousData: true,
  });
}

export function useAdminCompany(id: number) {
  return useQuery<AdminCompany>({
    queryKey: adminKeys.company(id),
    queryFn:  () => adminApi.getCompany(id),
    enabled:  !!id,
  });
}

// enabled يُتحكَّم به من الخارج (فقط عند فتح تبويب Users)
export function useAdminCompanyUsers(id: number, enabled = true) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.companyUsers(id),
    queryFn:  () => adminApi.getCompanyUsers(id),
    enabled:  !!id && enabled,
  });
}

// ── Company Mutations ─────────────────────────────────────────
export function useAdminCompanyMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        adminApi.suspendCompany(id, reason),
      onSuccess: invalidate,
    }),
    unsuspend: useMutation({
      mutationFn: (id: number) => adminApi.unsuspendCompany(id),
      onSuccess: invalidate,
    }),
    verify: useMutation({
      mutationFn: (id: number) => adminApi.verifyCompany(id),
      onSuccess: invalidate,
    }),
    unverify: useMutation({
      mutationFn: (id: number) => adminApi.unverifyCompany(id),
      onSuccess: invalidate,
    }),
    activate: useMutation({
      mutationFn: (id: number) => adminApi.activateCompany(id),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: number) => adminApi.deactivateCompany(id),
      onSuccess: invalidate,
    }),
    changePlan: useMutation({
      mutationFn: ({ id, ...data }: {
        id: number; plan: string;
        max_users?: number; max_warehouses?: number; max_products?: number;
      }) => adminApi.changePlan(id, data),
      onSuccess: invalidate,
    }),
    deleteCompany: useMutation({
      mutationFn: (id: number) => adminApi.deleteCompany(id),
      onSuccess: invalidate,
    }),
    updateNotes: useMutation({
      mutationFn: ({ id, notes }: { id: number; notes: string }) =>
        adminApi.updateNotes(id, notes),
      onSuccess: invalidate,
    }),
    addUser: useMutation({
      mutationFn: ({ companyId, userId, role }: { companyId: number; userId: number; role?: string }) =>
        adminApi.addCompanyUser(companyId, userId, role),
      onSuccess: invalidate,
    }),
    removeUser: useMutation({
      mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) =>
        adminApi.removeCompanyUser(companyId, userId),
      onSuccess: invalidate,
    }),
    toggleUser: useMutation({
      mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) =>
        adminApi.toggleCompanyUser(companyId, userId),
      onSuccess: invalidate,
    }),
  };
}

// ── Users ─────────────────────────────────────────────────────
export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn:  () => adminApi.getUsers(params),
    staleTime: 60_000,
    keepPreviousData: true,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    createUser: useMutation({
      mutationFn: adminApi.createUser,
      onSuccess: invalidate,
    }),
    toggleActive: useMutation({
      mutationFn: (id: number) => adminApi.toggleUserActive(id),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, password, password_confirmation }:
        { id: number; password: string; password_confirmation: string }) =>
        adminApi.resetPassword(id, password, password_confirmation),
    }),
    deleteUser: useMutation({
      mutationFn: (id: number) => adminApi.deleteUser(id),
      onSuccess: invalidate,
    }),
    impersonate: useMutation({
      mutationFn: (id: number) => adminApi.impersonateStart(id),
    }),
  };
}

// ── Plans ─────────────────────────────────────────────────────
export function useAdminPlans() {
  return useQuery<AdminPlan[]>({
    queryKey: adminKeys.plans(),
    queryFn:  adminApi.getPlans,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Activity Logs ─────────────────────────────────────────────
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: adminKeys.activity(params),
    queryFn:  () => adminApi.getActivityLogs(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

export function useAdminActivityExport() {
  return useMutation({
    mutationFn: async (params?: AdminActivityParams) => {
      const blob = await adminApi.exportActivityLogs(params) as Blob;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `activity_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ── System Settings ───────────────────────────────────────────
export function useAdminSettings() {
  return useQuery<SystemSettings>({
    queryKey: adminKeys.settings(),
    queryFn:  adminApi.getSystemSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSystemSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  });
}
```

## FILE: resources/js/hooks/useClients.ts
```
```

## FILE: resources/js/hooks/useDashboard.ts
```
// ════════════════════════════════════════════════
// hooks/useDashboard.ts (مُصحَّح – يستخدم apiGet)
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export const DASHBOARD_KEYS = {
  stats:        ['dashboard', 'stats'],
  chart:        (period: string) => ['dashboard', 'chart', period],
  topProducts:  ['dashboard', 'top-products'],
  invoices:     ['dashboard', 'recent-invoices'],
  inventory:    ['dashboard', 'inventory'],
} as const;

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats,
    queryFn:  dashboardApi.getStats,            // apiGet تُرجع البيانات مباشرة
    staleTime: 60_000,
  });
}

export function useSalesChart(period = 'monthly') {
  return useQuery({
    queryKey: DASHBOARD_KEYS.chart(period),
    queryFn:  () => dashboardApi.getSalesChart(period),
  });
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.topProducts,
    queryFn:  () => dashboardApi.getTopProducts(limit),
  });
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.invoices,
    queryFn:  dashboardApi.getRecentInvoices,
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.inventory,
    queryFn:  dashboardApi.getInventoryAlerts,
  });
}
```

## FILE: resources/js/hooks/useData.ts
```
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, partiesApi, lookupsApi } from '@/lib/api';
import { apiGet } from '@/lib/api/client';
import type { InvoiceFilters } from '@/lib/api/invoices';
import type { PartyFilters } from '@/lib/api/parties';
import type {
  CommercialDocument, Party, Unit, Tva, Family, Brand,
  PriceLevel, Warehouse, FiscalYear, Currency, DocumentType,
  PaymentMode, TreasuryAccount
} from '@/types';

const STALE = 10 * 60_000;

// ────────── الفواتير ──────────
export const INVOICES_KEYS = {
  all: ['invoices'] as const,
  list: (f: InvoiceFilters) => ['invoices', 'list', f] as const,
  detail: (id: number) => ['invoices', id] as const,
};

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: INVOICES_KEYS.list(filters),
    queryFn: () => invoicesApi.list(filters),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: INVOICES_KEYS.detail(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CommercialDocument>) => invoicesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useValidateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invoicesApi.validate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invoicesApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICES_KEYS.all }),
  });
}

// ────────── الأطراف ──────────
export const PARTIES_KEYS = {
  all: ['parties'] as const,
  customers: (f: PartyFilters) => ['parties', 'customers', f] as const,
  suppliers: (f: PartyFilters) => ['parties', 'suppliers', f] as const,
  detail: (id: number) => ['parties', id] as const,
};

export function useCustomers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.customers(filters),
    queryFn: () => partiesApi.getCustomers(filters),
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.suppliers(filters),
    queryFn: () => partiesApi.getSuppliers(filters),
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Party>) => partiesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
      partiesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

// ────────── الجداول المرجعية ──────────
export const useUnits = () =>
  useQuery({
    queryKey: ['units'],
    queryFn: () => apiGet<Unit[]>('/units'),
    staleTime: STALE,
  });

export const useTvas = () =>
  useQuery({
    queryKey: ['tvas'],
    queryFn: () => apiGet<Tva[]>('/tvas'),
    staleTime: STALE,
  });

export const useFamilies = () =>
  useQuery({
    queryKey: ['families'],
    queryFn: () => apiGet<Family[]>('/families', { per_page: 50 }),
    staleTime: STALE,
  });

export const useBrands = () =>
  useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<Brand[]>('/brands', { per_page: 50 }),
    staleTime: STALE,
  });

export const usePriceLevels = () =>
  useQuery({
    queryKey: ['price-levels'],
    queryFn: () => apiGet<PriceLevel[]>('/price-levels', { per_page: 50 }),
    staleTime: STALE,
  });

export const useWarehouses = () =>
  useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiGet<Warehouse[]>('/warehouses', { per_page: 20 }),
    staleTime: STALE,
  });

export const useFiscalYears = () =>
  useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () => apiGet<FiscalYear[]>('/fiscal-years', { per_page: 50 }),
    staleTime: STALE,
  });

export const useCurrentFiscalYear = () =>
  useQuery({
    queryKey: ['current-fiscal-year'],
    queryFn: () => apiGet<FiscalYear>('/fiscal-years/current'),
    staleTime: STALE,
  });

export const useCurrencies = () =>
  useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiGet<Currency[]>('/currencies'),
    staleTime: STALE,
  });

export const useDocumentTypes = () =>
  useQuery({
    queryKey: ['document-types'],
    queryFn: () => apiGet<DocumentType[]>('/document-types', { per_page: 50 }),
    staleTime: STALE,
  });

export const usePaymentModes = () =>
  useQuery({
    queryKey: ['payment-modes'],
    queryFn: () => apiGet<PaymentMode[]>('/payment-modes', { per_page: 50 }),
    staleTime: STALE,
  });

export const useTreasuryAccounts = () =>
  useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => apiGet<TreasuryAccount[]>('/treasury-accounts'),
    staleTime: STALE,
  });

export const useTreasuryAccountTypes = () =>
  useQuery({
    queryKey: ['treasury-account-types'],
    queryFn: () => apiGet<any[]>('/treasury-account-types'),
    staleTime: STALE,
  });

export const useDocumentStatuses = () =>
  useQuery({
    queryKey: ['document-statuses'],
    queryFn: () => apiGet<any[]>('/document-statuses'),
    staleTime: STALE,
  });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => apiGet<any[]>('/expense-categories'),
    staleTime: STALE,
  });
```

## FILE: resources/js/hooks/useDebounce.ts
```
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

## FILE: resources/js/hooks/useInvoices.ts
```
// hooks/useInvoices.ts (مُصحَّح – يستخدم apiGet من invoicesApi)
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
    queryFn:  () => invoicesApi.list(filters),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: INVOICES_KEYS.detail(id),
    queryFn:  () => invoicesApi.get(id),
    enabled:  !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CommercialDocument>) => invoicesApi.create(data),
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
```

## FILE: resources/js/hooks/useLookup.ts
```
// ════════════════════════════════════════════════
// resources/js/hooks/useLookup.ts (مُحسَّن – يستخدم apiGet, apiPost, apiPut, apiDelete)
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';

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
      const data = await apiGet<T[]>(endpoint, { per_page: 50 });
      setState(s => ({ ...s, items: Array.isArray(data) ? data : [], loading: false }));
    } catch (e: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: e?.message || 'حدث خطأ في جلب البيانات',
      }));
    }
  }, [endpoint]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const newItem = await apiPost<T>(endpoint, data);
      setState(s => ({ ...s, items: [newItem, ...s.items], saving: false }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.message || 'فشل الحفظ');
    }
  }, [endpoint]);

  const update = useCallback(async (id: number, data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const updated = await apiPut<T>(`${endpoint}/${id}`, data);
      setState(s => ({
        ...s,
        items: s.items.map(i => i.id === id ? updated : i),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.message || 'فشل التحديث');
    }
  }, [endpoint]);

  const remove = useCallback(async (id: number) => {
    setState(s => ({ ...s, saving: true }));
    try {
      await apiDelete(`${endpoint}/${id}`);
      setState(s => ({
        ...s,
        items: s.items.filter(i => i.id !== id),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.message || 'فشل الحذف');
    }
  }, [endpoint]);

  return { ...state, refetch: fetchAll, create, update, remove };
}
```

## FILE: resources/js/hooks/useLookups.ts
```
// ════════════════════════════════════════════════
// resources/js/hooks/useLookups.ts (مُصحَّح – يستخدم apiGet مع slug)
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import type { Family, Brand, ProductType, Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';

const STALE = Infinity; // جداول مرجعية نادراً ما تتغير

export function useLookups() {
  const { activeCompany } = useAuth();
  const slug = activeCompany?.slug ?? '';
  const enabled = !!slug;

  const families = useQuery<Family[]>({
    queryKey: ['families', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<Family[]>('/families', { per_page: 50 }),
  });

  const brands = useQuery<Brand[]>({
    queryKey: ['brands', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<Brand[]>('/brands', { per_page: 50 }),
  });

  const productTypes = useQuery<ProductType[]>({
    queryKey: ['product-types', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<ProductType[]>('/product-types', { per_page: 50 }),
  });

  const units = useQuery<Unit[]>({
    queryKey: ['units', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<Unit[]>('/units', { per_page: 20 }),
  });

  const tvaRates = useQuery<TvaRate[]>({
    queryKey: ['tvas', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<TvaRate[]>('/tvas', { per_page: 20 }),
  });

  const priceLevels = useQuery<PriceLevel[]>({
    queryKey: ['price-levels', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<PriceLevel[]>('/price-levels', { per_page: 50 }),
  });

  const valuationMethods = useQuery<InventoryValuationMethod[]>({
    queryKey: ['valuation-methods', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods', { per_page: 20 }),
  });

  const warehouses = useQuery<Warehouse[]>({
    queryKey: ['warehouses', slug],
    enabled,
    staleTime: STALE,
    queryFn: () => apiGet<Warehouse[]>('/warehouses', { per_page: 50 }),
  });

  return {
    families:         families.data       ?? [],
    brands:           brands.data         ?? [],
    productTypes:     productTypes.data   ?? [],
    units:            units.data          ?? [],
    tvaRates:         tvaRates.data       ?? [],
    priceLevels:      priceLevels.data    ?? [],
    valuationMethods: valuationMethods.data ?? [],
    warehouses:       warehouses.data     ?? [],
    isLoading:
      families.isLoading   ||
      brands.isLoading     ||
      productTypes.isLoading,
  };
}
```

## FILE: resources/js/hooks/useModal.ts
```
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
// hooks/useParties.ts (مُصحَّح – يستخدم apiGet من partiesApi)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partiesApi } from '@/lib/api';
import type { Party } from '@/types';
import type { PartyFilters } from '@/lib/api/parties';

export const PARTIES_KEYS = {
  all:       ['parties'] as const,
  customers: (f: PartyFilters) => ['parties', 'customers', f] as const,
  suppliers: (f: PartyFilters) => ['parties', 'suppliers', f] as const,
  detail:    (id: number)        => ['parties', id] as const,
};

export function useCustomers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.customers(filters),
    queryFn:  () => partiesApi.getCustomers(filters),
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  return useQuery({
    queryKey: PARTIES_KEYS.suppliers(filters),
    queryFn:  () => partiesApi.getSuppliers(filters),
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Party>) => partiesApi.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
      partiesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PARTIES_KEYS.all }),
  });
}
```

## FILE: resources/js/hooks/useProducts.ts
```
// hooks/useProducts.ts (مُصحَّح + إضافة useVariants و useLowStockVariants)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { Product, ProductVariant, PaginatedResponse } from '@/types';

// ----------------------------------------------------------------
// 1. المنتجات الأساسية
// ----------------------------------------------------------------
export interface ProductFilters {
  search?: string;
  family_id?: number;
  brand_id?: number;
  product_type_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
  sort?: string;
  include?: string;
}

export const PRODUCTS_KEYS = {
  all:         ['products'] as const,
  list:        (f: ProductFilters) => ['products', 'list', f] as const,
  detail:      (id: number)        => ['products', 'detail', id] as const,
  active:      ['products', 'active'],
  byFamily:    (id: number)        => ['products', 'by-family', id],
  byBrand:     (id: number)        => ['products', 'by-brand', id],
};

export function useProducts(filters: ProductFilters = {}) {
  const cleanParams: Record<string, any> = {};
  if (filters.search) cleanParams.search = filters.search;
  if (filters.family_id) cleanParams['filter[family_id]'] = filters.family_id;
  if (filters.brand_id) cleanParams['filter[brand_id]'] = filters.brand_id;
  if (filters.product_type_id) cleanParams['filter[product_type_id]'] = filters.product_type_id;
  if (filters.active !== undefined) cleanParams['filter[active]'] = filters.active;
  if (filters.page) cleanParams.page = filters.page;
  if (filters.per_page) cleanParams.per_page = filters.per_page;
  if (filters.sort) cleanParams.sort = filters.sort;
  if (filters.include) cleanParams.include = filters.include;

  return useQuery({
    queryKey: PRODUCTS_KEYS.list(filters),
    queryFn:  () => apiGet<PaginatedResponse<Product>>('/products', cleanParams),
    keepPreviousData: true,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.detail(id),
    queryFn:  () => apiGet<Product>(`/products/${id}`, { include: 'family,brand,prices,packagings' }),
    enabled:  !!id,
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEYS.active,
    queryFn:  () => apiGet<Product[]>('/products/active'),
  });
}

export function useProductsByFamily(familyId: number) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.byFamily(familyId),
    queryFn:  () => apiGet<Product[]>(`/products/by-family/${familyId}`),
    enabled:  !!familyId,
  });
}

export function useProductsByBrand(brandId: number) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.byBrand(brandId),
    queryFn:  () => apiGet<Product[]>(`/products/by-brand/${brandId}`),
    enabled:  !!brandId,
  });
}

// ----------------------------------------------------------------
// 2. طفرات المنتجات
// ----------------------------------------------------------------
export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const create = useMutation({
    mutationFn: (data: Partial<Product>) => apiPost<Product>('/products', data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      apiPut<Product>(`/products/${id}`, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/products/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ----------------------------------------------------------------
// 3. متغيرات المنتجات (Product Variants)
// ----------------------------------------------------------------
export interface VariantFilters {
  search?: string;
  barcode?: string;
  product_id?: number;
  page?: number;
  per_page?: number;
}

export const VARIANTS_KEYS = {
  all:       ['variants'] as const,
  list:      (f: VariantFilters) => ['variants', 'list', f] as const,
  detail:    (id: number)        => ['variants', 'detail', id] as const,
  lowStock:  ['variants', 'low-stock'],
};

export function useVariants(filters: VariantFilters = {}) {
  const params: Record<string, any> = {};
  if (filters.search) params.search = filters.search;
  if (filters.barcode) params.barcode = filters.barcode;
  if (filters.product_id) params['filter[product_id]'] = filters.product_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;

  return useQuery({
    queryKey: VARIANTS_KEYS.list(filters),
    queryFn:  () => apiGet<PaginatedResponse<ProductVariant>>('/product-variants', params),
    keepPreviousData: true,
  });
}

export function useVariant(id: number) {
  return useQuery({
    queryKey: VARIANTS_KEYS.detail(id),
    queryFn:  () => apiGet<ProductVariant>(`/product-variants/${id}`),
    enabled:  !!id,
  });
}

export function useLowStockVariants() {
  return useQuery({
    queryKey: VARIANTS_KEYS.lowStock,
    queryFn:  () => apiGet<ProductVariant[]>('/product-variants/low-stock'),
  });
}

export function useVariantByBarcode(barcode: string) {
  return useQuery({
    queryKey: [...VARIANTS_KEYS.all, 'barcode', barcode],
    queryFn:  () => apiGet<ProductVariant[]>('/product-variants', { barcode }),
    enabled:  !!barcode,
  });
}

export function useVariantMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['variants'] });

  const create = useMutation({
    mutationFn: (data: Partial<ProductVariant>) => apiPost<ProductVariant>('/product-variants', data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
      apiPut<ProductVariant>(`/product-variants/${id}`, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/product-variants/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
```

## FILE: resources/js/hooks/useTheme.ts
```
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
  '/quotations':   { title:'فاتورة شكلية',          path:'مبيعات ← عروض أسعار'      },
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
// ════════════════════════════════════════════════
// lib/api/admin.ts — النسخة الكاملة
// جميع endpoints الـ Super Admin
// ════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client';
import type {
  AdminCompany, AdminUser, AdminPlan, AdminStats, ActivityLog,
  PaginatedResponse, AdminCompaniesParams, AdminUsersParams,
  AdminActivityParams, SystemSettings,
} from '@/types/admin';

export const adminApi = {

  // ── Dashboard ────────────────────────────────────────────────
  getDashboard: () =>
    apiGet<AdminStats>('/admin/dashboard'),

  // ── Companies ────────────────────────────────────────────────
  getCompanies: (params?: AdminCompaniesParams) =>
    apiGet<PaginatedResponse<AdminCompany>>('/admin/companies', params as Record<string, unknown>),

  getCompany: (id: number) =>
    apiGet<AdminCompany>(`/admin/companies/${id}`),

  createCompany: (data: Partial<AdminCompany> & { owner_id: number }) =>
    apiPost<AdminCompany>('/admin/companies', data),

  updateCompany: (id: number, data: Partial<AdminCompany>) =>
    apiPut<AdminCompany>(`/admin/companies/${id}`, data),

  deleteCompany: (id: number) =>
    apiDelete(`/admin/companies/${id}`),

  suspendCompany: (id: number, reason: string) =>
    apiPost(`/admin/companies/${id}/suspend`, { reason }),

  unsuspendCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/unsuspend`),

  activateCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/activate`),

  deactivateCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/deactivate`),

  verifyCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/verify`),

  unverifyCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/unverify`),

  changePlan: (id: number, data: {
    plan: string;
    max_users?: number;
    max_warehouses?: number;
    max_products?: number;
  }) => apiPost(`/admin/companies/${id}/change-plan`, data),

  updateNotes: (id: number, notes: string) =>
    apiPatch(`/admin/companies/${id}/notes`, { notes }),

  getCompanyUsers: (id: number, params?: Record<string, unknown>) =>
    apiGet<PaginatedResponse<AdminUser>>(`/admin/companies/${id}/users`, params),

  addCompanyUser: (companyId: number, userId: number, role?: string) =>
    apiPost(`/admin/companies/${companyId}/users`, { user_id: userId, role }),

  removeCompanyUser: (companyId: number, userId: number) =>
    apiDelete(`/admin/companies/${companyId}/users/${userId}`),

  toggleCompanyUser: (companyId: number, userId: number) =>
    apiPatch(`/admin/companies/${companyId}/users/${userId}/toggle`),

  // ── Users ────────────────────────────────────────────────────
  getUsers: (params?: AdminUsersParams) =>
    apiGet<PaginatedResponse<AdminUser>>('/admin/users', params as Record<string, unknown>),

  getUser: (id: number) =>
    apiGet<AdminUser>(`/admin/users/${id}`),

  createUser: (data: { name: string; email: string; password: string; role?: string; company_id?: number }) =>
    apiPost<AdminUser>('/admin/users', data),

  updateUser: (id: number, data: Partial<AdminUser>) =>
    apiPut<AdminUser>(`/admin/users/${id}`, data),

  deleteUser: (id: number) =>
    apiDelete(`/admin/users/${id}`),

  resetPassword: (id: number, password: string, password_confirmation: string) =>
    apiPost(`/admin/users/${id}/reset-password`, { password, password_confirmation }),

  toggleUserActive: (id: number) =>
    apiPost(`/admin/users/${id}/toggle-active`),

  getUserCompanies: (id: number) =>
    apiGet<AdminCompany[]>(`/admin/users/${id}/companies`),

  // ── Plans ────────────────────────────────────────────────────
  getPlans: () =>
    apiGet<AdminPlan[]>('/admin/plans'),

  // ── Impersonate ──────────────────────────────────────────────
  impersonateStart: (userId: number) =>
    apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${userId}`),

  impersonateStop: () =>
    apiPost('/admin/impersonate/stop'),

  // ── Activity Logs ────────────────────────────────────────────
  getActivityLogs: (params?: AdminActivityParams) =>
    apiGet<PaginatedResponse<ActivityLog>>('/admin/activity-log', params as Record<string, unknown>),

  getActivityLog: (id: number) =>
    apiGet<ActivityLog>(`/admin/activity-log/${id}`),

  exportActivityLogs: (params?: AdminActivityParams) =>
    apiGet('/admin/activity-log', { ...params as Record<string, unknown>, export: 'csv' }, { responseType: 'blob' }),

  // ── System Settings ──────────────────────────────────────────
  getSystemSettings: () =>
    apiGet<SystemSettings>('/admin/settings'),

  updateSystemSettings: (data: Partial<SystemSettings>) =>
    apiPut<SystemSettings>('/admin/settings', data),

  // ── System Operations ────────────────────────────────────────
  clearCache: () =>
    apiPost('/admin/maintenance/cache-clear'),

  runScheduler: () =>
    apiPost('/admin/maintenance/run-jobs'),

  enableMaintenance: (message?: string) =>
    apiPost('/admin/maintenance/enable', { message }),

  disableMaintenance: () =>
    apiPost('/admin/maintenance/disable'),

  exportBackup: () =>
    apiGet('/admin/system/backup', undefined, { responseType: 'blob' }),

  // ── Reports ──────────────────────────────────────────────────
  getReports: (period: '7d' | '30d' | '90d') =>
    apiGet<{
      users: Array<{ date: string; value: number }>;
      companies: Array<{ date: string; value: number }>;
      apiCalls: Array<{ date: string; value: number }>;
      revenue: Array<{ date: string; value: number }>;
    }>('/admin/reports', { period }),
};
```

## FILE: resources/js/lib/api/client.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/client.ts
// Axios Instance — Enterprise-grade Multi-Tenancy HTTP Client
// ✅ تحديث: إضافة slug تلقائيًا لجميع طلبات tenant
// ════════════════════════════════════════════════════════════════════════════

import axios, {
    type AxiosInstance,
    type AxiosError,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// 0. Types
// ─────────────────────────────────────────────────────────────────────────────

/** هيكل الخطأ الموحَّد القادم من Laravel API */
export interface ApiErrorPayload {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
    meta?: Record<string, unknown>;
}

/** خطأ منظَّم يُلقى من كل طلب فاشل */
export class ApiError extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly errors: Record<string, string[]>;
    public readonly meta: Record<string, unknown>;

    constructor(status: number, payload: ApiErrorPayload) {
        super(payload.message ?? "حدث خطأ غير متوقع");
        this.name = "ApiError";
        this.status = status;
        this.code = payload.code ?? "UNKNOWN";
        this.errors = payload.errors ?? {};
        this.meta = payload.meta ?? {};
    }

    hasFieldError(field: string): boolean {
        return field in this.errors;
    }

    fieldError(field: string): string | undefined {
        return this.errors[field]?.[0];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Token storage
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = "auth_token";

export const tokenStorage = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
} as const;

export const setAuthToken = tokenStorage.set;
export const clearAuthToken = tokenStorage.clear;
export const getAuthToken = tokenStorage.get;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Active-company slug accessor (محسّن)
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_COMPANY_KEY = "active_company";

function getActiveSlug(): string | null {
    // 1. من sessionStorage (المصدر الأساسي)
    try {
        const raw = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.slug) return parsed.slug;
        }
    } catch {}

    // 2. من localStorage (احتياطي)
    try {
        const raw = localStorage.getItem(ACTIVE_COMPANY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.slug) return parsed.slug;
        }
    } catch {}

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Request ID generator
// ─────────────────────────────────────────────────────────────────────────────

let _reqCounter = 0;
function generateRequestId(): string {
    _reqCounter = (_reqCounter + 1) % 1_000_000;
    return `${Date.now().toString(36)}-${_reqCounter.toString(36)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 401 refresh queue
// ─────────────────────────────────────────────────────────────────────────────

type QueueItem = {
    resolve: (token: string) => void;
    reject: (reason: unknown) => void;
};

let _isRefreshing = false;
let _failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null): void {
    _failedQueue.forEach((item) => {
        if (error || !token) item.reject(error);
        else item.resolve(token);
    });
    _failedQueue = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. In-flight request deduplication (GET only)
// ─────────────────────────────────────────────────────────────────────────────

const _pendingRequests = new Map<string, Promise<unknown>>();

function getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method?.toUpperCase()}::${config.url}::${JSON.stringify(config.params ?? {})}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Axios instance
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

const client: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// 6-b. قائمة المسارات العامة (لا تحتاج slug)
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATH_PREFIXES = [
    "/auth",
    "/companies",
    "/admin",
    "/wilayas",
    "/communes",
    "/genders",        // ✅ global — لا تحتاج slug
    "/legal-forms",    // ✅ global — لا تحتاج slug
];

function isPublicPath(path: string): boolean {
    const cleanPath = path.split("?")[0];
    return PUBLIC_PATH_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
}
/**
 * تتحقق مما إذا كان الرابط يحمل slug مضمَّناً (يبدأ بـ /كلمة/...)
 * تُستخدم لإسكات تحذير "No active company slug" عندما يكون slug محقوناً في الرابط.
 */
function urlLooksSlugged(path: string): boolean {
    return /^\/[a-z0-9][a-z0-9-]*\//.test(path);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-c. الكشف عن URL يحمل slug مضمَّناً بالفعل: /{word}/...
//      يُستخدم لتجنب حقن slug مكرَّر ولإسكات تحذير "No active slug"
// ─────────────────────────────────────────────────────────────────────────────

function isPreSluggedUrl(path: string, slug: string | null): boolean {
    if (!slug) return false;
    const cleanPath = path.split("?")[0];
    // ✅ يتحقق أن slug الشركة الفعلي موجود — يمنع /warehouses/5 من الاعتبار pre-slugged
    return cleanPath.startsWith(`/${slug}/`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. REQUEST interceptor (✅ التعديل الأساسي)
// ─────────────────────────────────────────────────────────────────────────────

client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 7-a. استخراج slug
        const slug = getActiveSlug();
        const originalUrl = config.url ?? "";

        // 7-b. إضافة slug تلقائيًا لجميع مسارات tenant
        // المقارنة مع active slug فقط — آمنة لأن أي مسار بـ slug مختلف
        // يُرسَل يدوياً فقط من OnboardingPage حيث slug=null أصلاً
        if (slug && !isPublicPath(originalUrl)) {
            if (
                !originalUrl.startsWith(`/${slug}/`) &&
                !isPreSluggedUrl(originalUrl, slug)
            ) {
                config.url = `/${slug}${originalUrl}`;
                if (import.meta.env.DEV) {
                    console.debug(
                        `🌐 Tenant request: ${config.method?.toUpperCase()} ${config.baseURL ?? ""}${config.url}`,
                    );
                }
            }
        } else if (
            !slug &&
            !isPublicPath(originalUrl) &&
            !urlLooksSlugged(originalUrl)
        ) {
            // تحذير فقط إذا كان URL لا يحمل slug مضمَّناً
                       if (import.meta.env.DEV) {
                console.warn(
                    `⚠️ No active company slug for request: ${config.method?.toUpperCase()} ${originalUrl}`,
                );
            }

        }

        // 7-c. Bearer token
        const token = tokenStorage.get();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 7-d. Tenant slug header (للتتبع)
        if (slug) {
            config.headers["X-Company-Slug"] = slug;
        }

        // 7-e. Request tracing ID
        config.headers["X-Request-ID"] = generateRequestId();

        // 7-f. Upload timeout override
        if (config.data instanceof FormData) {
            config.timeout = 60_000;
        }

        return config;
    },
    (error: unknown) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESPONSE interceptor (مُحسَّن لاستخراج البيانات)
// ─────────────────────────────────────────────────────────────────────────────

client.interceptors.response.use(
    (response) => response,

    async (error: AxiosError<ApiErrorPayload>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };
        const status = error.response?.status;
        const payload = error.response?.data;

        // 8-b-i. 401 Unauthorized
        if (status === 401) {
            const originalRequest =
                error.config as InternalAxiosRequestConfig & {
                    _retry?: boolean;
                };
            const url = originalRequest.url ?? "";

            // ✅ لا تقم بتسجيل الخروج للمسارات الإدارية، فقط ارفض الطلب
            if (url.includes("/admin/")) {
                return Promise.reject(buildApiError(status, payload));
            }

            // باقي المعالجة الحالية للمسارات العادية (refresh, logout)
            if (window.location.pathname === "/login") {
                return Promise.reject(buildApiError(status, payload));
            }
            if (originalRequest._retry) {
                handleForcedLogout();
                return Promise.reject(buildApiError(status, payload));
            }
            if (_isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    _failedQueue.push({ resolve, reject });
                })
                    .then((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return client(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }
            _isRefreshing = true;
            originalRequest._retry = true;

            try {
                const currentToken = tokenStorage.get();
                if (!currentToken) throw new Error("no_token");
                throw new Error("token_rejected");
            } catch {
                processQueue(new Error("Session expired"), null);
                handleForcedLogout();
                return Promise.reject(
                    buildApiError(401, {
                        message: "انتهت جلستك، يرجى تسجيل الدخول مجدداً",
                    }),
                );
            } finally {
                _isRefreshing = false;
            }
        }

        // 8-b-ii. 403 Forbidden
        if (status === 403) {
            const code = payload?.code;
            if (code === "COMPANY_SUSPENDED" || code === "COMPANY_INACTIVE") {
                try {
                    sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
                } catch {}
                if (window.location.pathname !== "/onboarding") {
                    window.location.href = "/onboarding";
                }
            }
            return Promise.reject(buildApiError(status, payload));
        }

        // 8-b-iii. 422 Validation
        if (status === 422) {
            return Promise.reject(buildApiError(status, payload));
        }

        // 8-b-iv. 429 Rate limit
        if (status === 429) {
            const retryAfter = error.response?.headers["retry-after"];
            return Promise.reject(
                buildApiError(status, {
                    message: `تجاوزت الحد المسموح من الطلبات. حاول بعد ${retryAfter ?? 60} ثانية.`,
                    code: "RATE_LIMITED",
                }),
            );
        }

        // 8-b-v. 5xx Server errors
        if (status && status >= 500) {
            return Promise.reject(
                buildApiError(status, {
                    message:
                        payload?.message ??
                        "خطأ في الخادم، يرجى المحاولة لاحقاً.",
                    code: "SERVER_ERROR",
                }),
            );
        }

        // 8-b-vi. Network / timeout
        if (!error.response) {
            return Promise.reject(
                buildApiError(0, {
                    message:
                        error.code === "ECONNABORTED"
                            ? "انتهت مهلة الطلب، تحقق من اتصالك."
                            : "لا يوجد اتصال بالإنترنت.",
                    code:
                        error.code === "ECONNABORTED"
                            ? "TIMEOUT"
                            : "NETWORK_ERROR",
                }),
            );
        }

        // 8-b-vii. Fallback
        return Promise.reject(buildApiError(status ?? 0, payload));
    },
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildApiError(
    status: number,
    payload: ApiErrorPayload | undefined,
): ApiError {
    return new ApiError(status, payload ?? { message: "حدث خطأ غير متوقع" });
}

function handleForcedLogout(): void {
    tokenStorage.clear();
    try {
        sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
        sessionStorage.removeItem("selected_fiscal_year");
    } catch {}

    const currentPath = window.location.pathname + window.location.search;
    const returnPath = currentPath !== "/login" ? currentPath : "/dashboard";
    window.location.href = `/login?return=${encodeURIComponent(returnPath)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. استخراج البيانات بمرونة (يتعامل مع اختلاف هيكل الاستجابة)
// ─────────────────────────────────────────────────────────────────────────────

// في نهاية الملف، استبدل extractData بهذا الإصدار المُحسَّن
function extractData<T>(response: any): T {
    const d = response?.data;

    if (Array.isArray(d)) return d as T;

    if (d && typeof d === "object") {
        // حالة paginator أو shape { data, meta }
        if ("meta" in d && "data" in d) {
            return d as T;
        }
        // حالة { status/success, data: ... }
        if ("data" in d && ("status" in d || "success" in d || "message" in d)) {
            return d.data as T;
        }
        // حالة { data: [...] } فقط
        if ("data" in d) {
            return d.data as T;
        }
    }

    // إذا لم نتمكن من استخراج البيانات، نُرجع مصفوفة فارغة (أو كائن فارغ) بدلاً من undefined
    if (import.meta.env.DEV) {
        console.warn(`[apiGet] Unexpected response shape, returning empty array.`, response);
    }
    return (Array.isArray(d) ? [] : {} as T);  // تجنب undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Typed request wrappers
// ─────────────────────────────────────────────────────────────────────────────

export interface LaravelResponse<T> {
    data: T;
    meta?: PaginationMeta;
    links?: PaginationLinks;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface PaginationLinks {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
}

/** GET → يُعيد T مباشرة (بعد سحب .data) */
export async function apiGet<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
): Promise<T> {
    const key = getRequestKey({ method: "GET", url, params });

    const existing = _pendingRequests.get(key);
    if (existing) return existing as Promise<T>;

    const promise = client
        .get<LaravelResponse<T>>(url, { params, ...config })
        .then((res) => extractData<T>(res))
        .finally(() => _pendingRequests.delete(key));

    _pendingRequests.set(key, promise);
    return promise;
}

/** POST → يُعيد T مباشرة */
export async function apiPost<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> {
    const res = await client.post<LaravelResponse<T>>(url, data, config);
    return extractData<T>(res);
}

/** PUT → يُعيد T مباشرة */
export async function apiPut<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> {
    const res = await client.put<LaravelResponse<T>>(url, data, config);
    return extractData<T>(res);
}

/** PATCH → يُعيد T مباشرة */
export async function apiPatch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> {
    const res = await client.patch<LaravelResponse<T>>(url, data, config);
    return extractData<T>(res);
}

/** DELETE → يُعيد void */
export async function apiDelete(
    url: string,
    config?: AxiosRequestConfig,
): Promise<void> {
    await client.delete(url, config);
}

/** Upload (FormData) → يُعيد T مباشرة */
export async function apiUpload<T>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
): Promise<T> {
    const res = await client.post<LaravelResponse<T>>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        },
    });
    return extractData<T>(res);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Tenant-scoped factory (اختياري)
// ─────────────────────────────────────────────────────────────────────────────

export function tenantApi(slug: string) {
    const prefix = (path: string) => `/${slug}/${path.replace(/^\//, "")}`;

    return {
        get: <T>(path: string, params?: Record<string, unknown>) =>
            apiGet<T>(prefix(path), params),
        post: <T>(path: string, data?: unknown) =>
            apiPost<T>(prefix(path), data),
        put: <T>(path: string, data?: unknown) => apiPut<T>(prefix(path), data),
        patch: <T>(path: string, data?: unknown) =>
            apiPatch<T>(prefix(path), data),
        delete: (path: string) => apiDelete(prefix(path)),
        upload: <T>(path: string, fd: FormData, cb?: (p: number) => void) =>
            apiUpload<T>(prefix(path), fd, cb),
    };
}

export default client;
```

## FILE: resources/js/lib/api/dashboard.ts
```
// ════════════════════════════════════════════════
// lib/api/dashboard.ts
// ════════════════════════════════════════════════
import { apiGet } from './client';
import type { DashboardStats, SalesChartData, TopProduct, CommercialDocument } from '@/types';

export const dashboardApi = {
  getStats: () => apiGet<DashboardStats>('/dashboard'),
  getSalesChart: (period?: string) => apiGet<SalesChartData>('/dashboard/sales-chart', { period }),
  getTopProducts: (limit = 5) => apiGet<TopProduct[]>('/dashboard/top-products', { limit }),
  getTopCustomers: (limit = 5) => apiGet<unknown[]>('/dashboard/top-customers', { limit }),
  getRecentInvoices: () => apiGet<CommercialDocument[]>('/dashboard/recent-transactions'),
  getInventoryAlerts: () => apiGet<unknown>('/dashboard/inventory'),
};
```

## FILE: resources/js/lib/api/index.ts
```
// ════════════════════════════════════════════════
// lib/api/index.ts — تصدير مركزي (نظيف)
// ════════════════════════════════════════════════
export { dashboardApi } from './dashboard';
export { productsApi, variantsApi } from './products';
export { invoicesApi } from './invoices';
export { partiesApi } from './parties';
export { default as apiClient, setAuthToken, clearAuthToken, getAuthToken, apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
```

## FILE: resources/js/lib/api/invoices.ts
```
// ════════════════════════════════════════════════
// lib/api/invoices.ts
// ════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
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
  list: (filters?: InvoiceFilters) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/commercial-documents', filters as Record<string, unknown>),

  get: (id: number) =>
    apiGet<CommercialDocument>(`/commercial-documents/${id}`),

  create: (data: Partial<CommercialDocument>) =>
    apiPost<CommercialDocument>('/commercial-documents', data),

  update: (id: number, data: Partial<CommercialDocument>) =>
    apiPut<CommercialDocument>(`/commercial-documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/commercial-documents/${id}`),

  validate: (id: number) =>
    apiPost(`/commercial-documents/${id}/validate`),

  lock: (id: number) =>
    apiPost(`/commercial-documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost(`/commercial-documents/${id}/unlock`),

  cancel: (id: number) =>
    apiPost(`/commercial-documents/${id}/cancel`),

  getUnpaid: () =>
    apiGet<PaginatedResponse<CommercialDocument>>('/commercial-documents/unpaid'),

  getOverdue: () =>
    apiGet<PaginatedResponse<CommercialDocument>>('/commercial-documents/overdue'),

  getQRCode: (id: number) =>
    apiGet(`/commercial-documents/${id}/qrcode`),
};
```

## FILE: resources/js/lib/api/parties.ts
```
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import type { Party, PaginatedResponse } from '@/types';

export interface PartyFilters {
  search?: string;
  party_type_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
}

export const partiesApi = {
  list: (filters?: PartyFilters) =>
    apiGet<PaginatedResponse<Party>>('/parties', filters as Record<string, unknown>),

  get: (id: number) =>
    apiGet<Party>(`/parties/${id}`),

  create: (data: Partial<Party>) =>
    apiPost<Party>('/parties', data),

  update: (id: number, data: Partial<Party>) =>
    apiPut<Party>(`/parties/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/parties/${id}`),

  getCustomers: (filters?: PartyFilters) =>
    apiGet<PaginatedResponse<Party>>('/customers', filters as Record<string, unknown>),

  getSuppliers: (filters?: PartyFilters) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', filters as Record<string, unknown>),
};
```

## FILE: resources/js/lib/api/products.ts
```
// ════════════════════════════════════════════════
// lib/api/products.ts
// ════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Product, ProductVariant, PaginatedResponse } from '@/types';

export interface ProductFilters {
  search?: string;
  family_id?: number;
  brand_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
}

export const productsApi = {
  list: (filters?: ProductFilters) =>
    apiGet<PaginatedResponse<Product>>('/products', filters as Record<string, unknown>),

  get: (id: number) =>
    apiGet<Product>(`/products/${id}`),

  create: (data: Partial<Product>) =>
    apiPost<Product>('/products', data),

  update: (id: number, data: Partial<Product>) =>
    apiPut<Product>(`/products/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/products/${id}`),

  getActive: () =>
    apiGet<Product[]>('/products/active'),

  getByFamily: (familyId: number) =>
    apiGet<Product[]>(`/products/by-family/${familyId}`),

  getByBrand: (brandId: number) =>
    apiGet<Product[]>(`/products/by-brand/${brandId}`),
};

export const variantsApi = {
  list: (filters?: { search?: string; page?: number }) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', filters as Record<string, unknown>),

  get: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),

  getLowStock: () =>
    apiGet<ProductVariant[]>('/product-variants/low-stock'),

  getByBarcode: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants', { barcode }),
};
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

