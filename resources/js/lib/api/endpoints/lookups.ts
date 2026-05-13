// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lookups.ts — FIXED
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { globalKeys, tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import { useAuth } from '@/context/AuthContext';
import type {
  Currency, Tva, LegalForm, FiscalStamp, InventoryValuationMethod,
  Wilaya, Commune, DocumentStatus, DocumentType, DocumentBaseOperation,
  Unit, PriceLevel, Warehouse, PaymentMode, NumberingSeries,
  TreasuryAccount, ExpenseCategory, Brand, Family, ListParams,
} from '../core/types';

// ─── Stale times ──────────────────────────────────────────────────────────────
const GLOBAL_STALE = 60 * 60_000; // ساعة
const TENANT_STALE = 10 * 60_000; // 10 دقائق

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL LOOKUPS API
// ⚠️  هذه المسارات في PUBLIC_PREFIXES في client.ts → لا يُضاف لها slug
// ══════════════════════════════════════════════════════════════════════════════

export const globalLookupsApi = {
  currencies:              () => apiGet<Currency[]>('/currencies'),
  tvas:                    () => apiGet<Tva[]>('/tvas'),
  legalForms:              () => apiGet<LegalForm[]>('/legal-forms'),
  fiscalStamps:            () => apiGet<FiscalStamp[]>('/fiscal-stamps'),
  inventoryValuationMethods: () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods'),
  wilayas:                 () => apiGet<Wilaya[]>('/wilayas', { per_page: 500 }),
  communes:       (wilayaId: number) => apiGet<Commune[]>(`/communes/by-wilaya/${wilayaId}`),
  documentStatuses:        () => apiGet<DocumentStatus[]>('/document-statuses'),
  documentTypes:           () => apiGet<DocumentType[]>('/document-types'),
  documentBaseOperations:  () => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
} as const;

// ─── Global Lookup hook factory ───────────────────────────────────────────────
// ⚠️  لا نستخدم placeholderData: [] لأن [] ليست undefined
// React Query يُحدِّث عندما تعود البيانات الحقيقية
// ⚠️  select: data => data ?? [] يضمن أن القيمة لا تكون null

function useGlobalLookup<T>(
  queryKey: readonly unknown[],
  queryFn:  () => Promise<T[]>,
) {
  const { isAuthenticated } = useAuth();

  return useQuery<T[], Error, T[]>({
    queryKey,
    queryFn,
    staleTime: GLOBAL_STALE,
    enabled:   isAuthenticated,
    // ✅ FIX: select يضمن أن البيانات لا تكون null/undefined
    select:    (data) => Array.isArray(data) ? data : [],
    // ✅ FIX: لا نضع placeholderData: [] لأنه يُسبب undefined warning
    //    بدلاً من ذلك نعتمد على data ?? [] في الكومبوننت
  });
}

// ─── Global Hooks ─────────────────────────────────────────────────────────────
export const useGlobalCurrencies             = () => useGlobalLookup(globalKeys.currencies,              globalLookupsApi.currencies);
export const useGlobalTvas                   = () => useGlobalLookup(globalKeys.tvas,                    globalLookupsApi.tvas);
export const useGlobalLegalForms             = () => useGlobalLookup(globalKeys.legalForms,              globalLookupsApi.legalForms);
export const useGlobalFiscalStamps           = () => useGlobalLookup(globalKeys.fiscalStamps,            globalLookupsApi.fiscalStamps);
export const useGlobalInventoryValuationMethods = () => useGlobalLookup(globalKeys.inventoryValuationMethods, globalLookupsApi.inventoryValuationMethods);
export const useGlobalWilayas               = () => useGlobalLookup(globalKeys.wilayas,                 globalLookupsApi.wilayas);
export const useGlobalDocumentStatuses       = () => useGlobalLookup(globalKeys.documentStatuses,        globalLookupsApi.documentStatuses);
export const useGlobalDocumentTypes          = () => useGlobalLookup(globalKeys.documentTypes,           globalLookupsApi.documentTypes);
export const useGlobalDocumentBaseOperations = () => useGlobalLookup(globalKeys.documentBaseOperations,  globalLookupsApi.documentBaseOperations);

// ─── Communes (تأخذ wilayaId) ─────────────────────────────────────────────────
export function useGlobalCommunes(wilayaId: number | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery<Commune[], Error, Commune[]>({
    queryKey: globalKeys.communes(wilayaId ?? 0),
    queryFn:  () => globalLookupsApi.communes(wilayaId!),
    staleTime: GLOBAL_STALE,
    enabled:   isAuthenticated && !!wilayaId,
    select:    (data) => Array.isArray(data) ? data : [],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANT LOOKUPS API
// الـ interceptor يُضيف slug تلقائياً — لا داعي لإضافته في المسار
// ══════════════════════════════════════════════════════════════════════════════

export const tenantLookupsApi = {
  units:             (p?: ListParams) => apiGet<Unit[]>('/units',                   { per_page: 100, ...p }),
  warehouses:        (p?: ListParams) => apiGet<Warehouse[]>('/warehouses',         { per_page: 50,  ...p }),
  priceLevels:       (p?: ListParams) => apiGet<PriceLevel[]>('/price-levels',      { per_page: 50,  ...p }),
  paymentModes:      (p?: ListParams) => apiGet<PaymentMode[]>('/payment-modes',    { per_page: 50,  ...p }),
  numberingSeries:   (p?: ListParams) => apiGet<NumberingSeries[]>('/numbering-series', { per_page: 50, ...p }),
  treasuryAccounts:  (p?: ListParams) => apiGet<TreasuryAccount[]>('/treasury-accounts', { per_page: 50, ...p }),
  expenseCategories: (p?: ListParams) => apiGet<ExpenseCategory[]>('/expense-categories', { per_page: 100, ...p }),
  brands:            (p?: ListParams) => apiGet<Brand[]>('/brands',                 { per_page: 100, ...p }),
  families:          (p?: ListParams) => apiGet<Family[]>('/families',              { per_page: 100, ...p }),
} as const;

// ─── Generic tenant lookup hook factory ───────────────────────────────────────
function useTenantLookup<T>(
  keyFn:   (slug: string) => readonly unknown[],
  apiFn:   (p?: ListParams) => Promise<T[]>,
  params?: ListParams,
) {
  const slug = useActiveSlug();

  return useQuery<T[], Error, T[]>({
    queryKey: keyFn(slug ?? ''),
    queryFn:  () => apiFn(params),
    enabled:  !!slug,
    staleTime: TENANT_STALE,
    // ✅ FIX: نفس الحل — select يضمن array دائماً
    select:    (data) => Array.isArray(data) ? data : [],
  });
}

// ─── Tenant Hooks ─────────────────────────────────────────────────────────────
export const useUnits             = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.units,             tenantLookupsApi.units,             p);
export const useWarehouses        = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.warehouses,        tenantLookupsApi.warehouses,        p);
export const usePriceLevels       = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.priceLevels,       tenantLookupsApi.priceLevels,       p);
export const usePaymentModes      = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.paymentModes,      tenantLookupsApi.paymentModes,      p);
export const useNumberingSeries   = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.numberingSeries,   tenantLookupsApi.numberingSeries,   p);
export const useTreasuryAccounts  = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.treasuryAccounts,  tenantLookupsApi.treasuryAccounts,  p);
export const useExpenseCategories = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.expenseCategories, tenantLookupsApi.expenseCategories, p);
export const useBrands            = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.brands,            tenantLookupsApi.brands,            p);
export const useFamilies          = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.families,          tenantLookupsApi.families,          p);

// ─── CRUD mutations لجداول البحث التينانت ────────────────────────────────────
type LookupEntity = Unit | Warehouse | PriceLevel | PaymentMode | Brand | Family | ExpenseCategory;

function useLookupMutations<T extends LookupEntity>(
  resource: string,
  keyFn:    (slug: string) => readonly unknown[],
) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: keyFn(slug) }); };

  return {
    create: useMutation({ mutationFn: (data: Partial<T>) => apiPost<T>(`/${resource}`, data),                                    onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<T> }) => apiPut<T>(`/${resource}/${id}`, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: number)                                     => apiDelete(`/${resource}/${id}`),       onSuccess: inv }),
  };
}

export const useUnitMutations             = () => useLookupMutations<Unit>('units',                tenantKeys.lookups.units);
export const useWarehouseMutations        = () => useLookupMutations<Warehouse>('warehouses',      tenantKeys.lookups.warehouses);
export const usePriceLevelMutations       = () => useLookupMutations<PriceLevel>('price-levels',   tenantKeys.lookups.priceLevels);
export const usePaymentModeMutations      = () => useLookupMutations<PaymentMode>('payment-modes', tenantKeys.lookups.paymentModes);
export const useBrandMutations            = () => useLookupMutations<Brand>('brands',              tenantKeys.lookups.brands);
export const useFamilyMutations           = () => useLookupMutations<Family>('families',           tenantKeys.lookups.families);
export const useExpenseCategoryMutations  = () => useLookupMutations<ExpenseCategory>('expense-categories', tenantKeys.lookups.expenseCategories);
export const useNumberingSeriesMutations  = () => useLookupMutations<NumberingSeries>('numbering-series',   tenantKeys.lookups.numberingSeries);
export const useTreasuryAccountMutations  = () => useLookupMutations<TreasuryAccount>('treasury-accounts',  tenantKeys.lookups.treasuryAccounts);
