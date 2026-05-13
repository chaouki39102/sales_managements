// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lookups.ts
// Lookups API — Global (shared) + Tenant (per-company)
// ════════════════════════════════════════════════════════════════════════════

import {
  useQuery, useMutation, useQueryClient, UseQueryOptions,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { globalKeys, tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Currency, Tva, LegalForm, FiscalStamp, InventoryValuationMethod,
  Wilaya, Commune, DocumentStatus, DocumentType, DocumentBaseOperation,
  Unit, PriceLevel, Warehouse, PaymentMode, NumberingSeries,
  TreasuryAccount, ExpenseCategory, Brand, Family, ListParams,
} from '../core/types';

// ─── Stale times ─────────────────────────────────────────────────────────────

const GLOBAL_STALE  = 60 * 60_000; // ساعة — بيانات عالمية تتغير نادراً
const TENANT_STALE  = 10 * 60_000; // 10 دقائق

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL LOOKUPS (لا تحتاج slug — مشتركة بين كل الشركات)
// ═══════════════════════════════════════════════════════════════════════════════

export const globalLookupsApi = {
  currencies:                () => apiGet<Currency[]>('/currencies'),
  tvas:                      () => apiGet<Tva[]>('/tvas'),
  legalForms:                () => apiGet<LegalForm[]>('/legal-forms'),
  fiscalStamps:              () => apiGet<FiscalStamp[]>('/fiscal-stamps'),
  inventoryValuationMethods: () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods'),
  wilayas:                   () => apiGet<Wilaya[]>('/wilayas'),
  communes:    (wilayaId: number) => apiGet<Commune[]>(`/wilayas/${wilayaId}/communes`),
  documentStatuses:          () => apiGet<DocumentStatus[]>('/document-statuses'),
  documentTypes:             () => apiGet<DocumentType[]>('/document-types'),
  documentBaseOperations:    () => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
} as const;

export const useGlobalCurrencies   = () => useQuery({ queryKey: globalKeys.currencies,   queryFn: globalLookupsApi.currencies,   staleTime: GLOBAL_STALE });
export const useGlobalTvas         = () => useQuery({ queryKey: globalKeys.tvas,          queryFn: globalLookupsApi.tvas,          staleTime: GLOBAL_STALE });
export const useGlobalLegalForms   = () => useQuery({ queryKey: globalKeys.legalForms,    queryFn: globalLookupsApi.legalForms,    staleTime: GLOBAL_STALE });
export const useGlobalFiscalStamps = () => useQuery({ queryKey: globalKeys.fiscalStamps,  queryFn: globalLookupsApi.fiscalStamps,  staleTime: GLOBAL_STALE });
export const useGlobalInventoryValuationMethods = () =>
  useQuery({ queryKey: globalKeys.inventoryValuationMethods, queryFn: globalLookupsApi.inventoryValuationMethods, staleTime: GLOBAL_STALE });
export const useGlobalWilayas      = () => useQuery({ queryKey: globalKeys.wilayas,       queryFn: globalLookupsApi.wilayas,       staleTime: GLOBAL_STALE });
export const useGlobalCommunes     = (wilayaId: number) =>
  useQuery({ queryKey: globalKeys.communes(wilayaId), queryFn: () => globalLookupsApi.communes(wilayaId), enabled: !!wilayaId, staleTime: GLOBAL_STALE });
export const useGlobalDocumentStatuses = () =>
  useQuery({ queryKey: globalKeys.documentStatuses, queryFn: globalLookupsApi.documentStatuses, staleTime: GLOBAL_STALE });
export const useGlobalDocumentTypes = () =>
  useQuery({ queryKey: globalKeys.documentTypes, queryFn: globalLookupsApi.documentTypes, staleTime: GLOBAL_STALE });

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT LOOKUPS (مرتبطة بالشركة — تحتاج slug)
// ═══════════════════════════════════════════════════════════════════════════════

export const tenantLookupsApi = {
  units:            (slug: string, p?: ListParams) => apiGet<Unit[]>(`/units`, p),
  warehouses:       (slug: string, p?: ListParams) => apiGet<Warehouse[]>(`/warehouses`, p),
  priceLevels:      (slug: string, p?: ListParams) => apiGet<PriceLevel[]>(`/price-levels`, p),
  paymentModes:     (slug: string, p?: ListParams) => apiGet<PaymentMode[]>(`/payment-modes`, p),
  numberingSeries:  (slug: string, p?: ListParams) => apiGet<NumberingSeries[]>(`/numbering-series`, p),
  treasuryAccounts: (slug: string, p?: ListParams) => apiGet<TreasuryAccount[]>(`/treasury-accounts`, p),
  expenseCategories:(slug: string, p?: ListParams) => apiGet<ExpenseCategory[]>(`/expense-categories`, p),
  brands:           (slug: string, p?: ListParams) => apiGet<Brand[]>(`/brands`, p),
  families:         (slug: string, p?: ListParams) => apiGet<Family[]>(`/families`, p),
} as const;

// ─── Generic tenant lookup hook factory ──────────────────────────────────────

function useTenantLookup<T>(
  keyFn: (slug: string) => readonly unknown[],
  apiFn: (slug: string) => Promise<T>,
  options?: Partial<UseQueryOptions<T>>,
) {
  const slug = useActiveSlug();
  return useQuery<T>({
    queryKey: keyFn(slug ?? ''),
    queryFn:  () => apiFn(slug!),
    enabled:  !!slug,
    staleTime: TENANT_STALE,
    ...options,
  });
}

export const useUnits             = () => useTenantLookup(tenantKeys.lookups.units,             (s) => tenantLookupsApi.units(s));
export const useWarehouses        = () => useTenantLookup(tenantKeys.lookups.warehouses,         (s) => tenantLookupsApi.warehouses(s));
export const usePriceLevels       = () => useTenantLookup(tenantKeys.lookups.priceLevels,        (s) => tenantLookupsApi.priceLevels(s));
export const usePaymentModes      = () => useTenantLookup(tenantKeys.lookups.paymentModes,       (s) => tenantLookupsApi.paymentModes(s));
export const useNumberingSeries   = () => useTenantLookup(tenantKeys.lookups.numberingSeries,    (s) => tenantLookupsApi.numberingSeries(s));
export const useTreasuryAccounts  = () => useTenantLookup(tenantKeys.lookups.treasuryAccounts,   (s) => tenantLookupsApi.treasuryAccounts(s));
export const useExpenseCategories = () => useTenantLookup(tenantKeys.lookups.expenseCategories,  (s) => tenantLookupsApi.expenseCategories(s));
export const useBrands            = () => useTenantLookup(tenantKeys.lookups.brands,             (s) => tenantLookupsApi.brands(s));
export const useFamilies          = () => useTenantLookup(tenantKeys.lookups.families,           (s) => tenantLookupsApi.families(s));

// ─── CRUD mutations for tenant lookups ───────────────────────────────────────

type LookupEntity = Unit | Warehouse | PriceLevel | PaymentMode | Brand | Family | ExpenseCategory;

function useLookupMutations<T extends LookupEntity>(
  resource: string,
  keyFn: (slug: string) => readonly unknown[],
) {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: keyFn(slug) });
  };

  const create = useMutation({
    mutationFn: (data: Partial<T>) => apiPost<T>(`/${resource}`, data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<T> }) =>
      apiPut<T>(`/${resource}/${id}`, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/${resource}/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export const useUnitMutations             = () => useLookupMutations<Unit>('units', tenantKeys.lookups.units);
export const useWarehouseMutations        = () => useLookupMutations<Warehouse>('warehouses', tenantKeys.lookups.warehouses);
export const usePriceLevelMutations       = () => useLookupMutations<PriceLevel>('price-levels', tenantKeys.lookups.priceLevels);
export const usePaymentModeMutations      = () => useLookupMutations<PaymentMode>('payment-modes', tenantKeys.lookups.paymentModes);
export const useBrandMutations            = () => useLookupMutations<Brand>('brands', tenantKeys.lookups.brands);
export const useFamilyMutations           = () => useLookupMutations<Family>('families', tenantKeys.lookups.families);
export const useExpenseCategoryMutations  = () => useLookupMutations<ExpenseCategory>('expense-categories', tenantKeys.lookups.expenseCategories);
