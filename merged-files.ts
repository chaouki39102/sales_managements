/* ====================================================
   ⚠️ هذا الملف عبارة عن دمج لعدة ملفات من المشروع
   ⚠️ الملفات الأصلية مازالت منفصلة داخل المشروع
   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */


// ===== FILE: resources/js/hooks/useClients.ts =====



// ===== FILE: resources/js/hooks/useDashboard.ts =====

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


// ===== FILE: resources/js/hooks/useData.ts =====

// ════════════════════════════════════════════════
// hooks/useInvoices.ts
// ════════════════════════════════════════════════
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


// ════════════════════════════════════════════════
// hooks/useParties.ts
// ════════════════════════════════════════════════
import { useQuery as useQ, useMutation as useM, useQueryClient as useQC } from '@tanstack/react-query';
import { partiesApi } from '@/lib/api';
import type { PartyFilters } from '@/lib/api/invoices';
import type { Party } from '@/types';

export const PARTIES_KEYS = {
  all:       ['parties'] as const,
  customers: (f: object) => ['parties', 'customers', f] as const,
  suppliers: (f: object) => ['parties', 'suppliers', f] as const,
  detail:    (id: number) => ['parties', id] as const,
};

export function useCustomers(filters: PartyFilters = {}) {
  return useQ({
    queryKey: PARTIES_KEYS.customers(filters),
    queryFn:  () => partiesApi.getCustomers(filters).then(r => r.data),
  });
}

export function useSuppliers(filters: PartyFilters = {}) {
  return useQ({
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

export const useTreasuryAccountTypes = () => useQu({
    queryKey: ['treasury-account-types'],
    queryFn: () => lookupsApi.treasuryAccountTypes().then(r => r.data.data),
    staleTime: STALE
});


// ════════════════════════════════════════════════
// hooks/useLookups.ts — جداول البحث الثابتة (cached)
// ════════════════════════════════════════════════
import { useQuery as useQu } from '@tanstack/react-query';
import { lookupsApi } from '@/lib/api';

const STALE = 10 * 60_000; // 10 min — lookups rarely change

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




// ===== FILE: resources/js/hooks/useDebounce.ts =====

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}


// ===== FILE: resources/js/hooks/useInvoices.ts =====

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


// ===== FILE: resources/js/hooks/useLookup.ts =====

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


// ===== FILE: resources/js/hooks/useLookups.ts =====

import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';

export function useLookups() {
  const families = useQuery({ queryKey: ['families'], queryFn: productService.getFamilies, staleTime: Infinity });
  const brands = useQuery({ queryKey: ['brands'], queryFn: productService.getBrands, staleTime: Infinity });
  const productTypes = useQuery({ queryKey: ['product-types'], queryFn: productService.getProductTypes, staleTime: Infinity });
  const units = useQuery({ queryKey: ['units'], queryFn: productService.getUnits, staleTime: Infinity });
  const tvaRates = useQuery({ queryKey: ['tvas'], queryFn: productService.getTvaRates, staleTime: Infinity });
  const priceLevels = useQuery({ queryKey: ['price-levels'], queryFn: productService.getPriceLevels, staleTime: Infinity });
  const valuationMethods = useQuery({ queryKey: ['valuation-methods'], queryFn: productService.getValuationMethods, staleTime: Infinity });
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: productService.getWarehouses, staleTime: Infinity });

  return {
    families: families.data ?? [],
    brands: brands.data ?? [],
    productTypes: productTypes.data ?? [],
    units: units.data ?? [],
    tvaRates: tvaRates.data ?? [],
    priceLevels: priceLevels.data ?? [],
    valuationMethods: valuationMethods.data ?? [],
    warehouses: warehouses.data ?? [],
    isLoading: families.isLoading || brands.isLoading || productTypes.isLoading,
  };
}


// ===== FILE: resources/js/hooks/useModal.ts =====

// hooks/useModal.ts
import { useState, useCallback } from 'react';

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  const openModal  = useCallback(() => setOpen(true),  []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggle     = useCallback(() => setOpen(v => !v), []);
  return { open, openModal, closeModal, toggle };
}


// ===== FILE: resources/js/hooks/useParties.ts =====

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


// ===== FILE: resources/js/hooks/useProducts.ts =====

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { ProductInput } from '@/types/product';

export function useProducts(page = 1, perPage = 20, filters = {}, search = '', sort = 'name', order = 'asc') {
  return useQuery({
    queryKey: ['products', page, perPage, filters, search, sort, order],
    queryFn: () => productService.getProducts({ page, per_page: perPage, ...filters, search, sort: `${order === 'desc' ? '-' : ''}${sort}`, include: 'family,brand,productType,variants' }),
    keepPreviousData: true,
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const create = useMutation({ mutationFn: (data: ProductInput) => productService.createProduct(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<ProductInput> }) => productService.updateProduct(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  const remove = useMutation({ mutationFn: (id: number) => productService.deleteProduct(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  return { create, update, remove };
}


// ===== FILE: resources/js/hooks/useTheme.ts =====

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


// ===== FILE: resources/js/hooks/useTopbarTitle.ts =====

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

