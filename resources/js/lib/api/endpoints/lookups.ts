// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lookups.ts — النسخة النهائية المُصلحة
//
// ⚠️  قاعدة أساسية مستخرجة من api.php:
//   GLOBAL (بدون slug): wilayas, communes فقط
//   TENANT (مع slug):   كل شيء آخر بما فيها:
//     currencies, tvas, units, families, brands, document-types,
//     document-statuses, document-base-operations, genders, legal-forms,
//     party-types, product-types, fiscal-stamps, treasury-account-types,
//     stock-movement-types, inventory-valuation-methods ...
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { globalKeys, tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Currency, Tva, Unit, Family, Brand, PriceLevel, Warehouse,
  PaymentMode, DocumentType, DocumentStatus, DocumentBaseOperation,
  FiscalStamp, Gender, LegalForm, PartyType, ProductType,
  TreasuryAccountType, StockMovementType, InventoryValuationMethod,
  NumberingSeries, TreasuryAccount, ExpenseCategory, ExchangeRate,
  Wilaya, Commune,
} from '../core/types';

// ─── Stale times ──────────────────────────────────────────────────────────────
const GLOBAL_STALE = Infinity;    // wilayas/communes لا تتغير أبداً
const TENANT_STALE = 10 * 60_000; // 10 دقائق

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — GLOBAL (wilayas, communes فقط)
// ══════════════════════════════════════════════════════════════════════════════

export const globalLookupsApi = {
  wilayas:  ()              => apiGet<Wilaya[]>('/wilayas',  { per_page: 500 }),
  communes: (wId: number)   => apiGet<Commune[]>(`/communes/by-wilaya/${wId}`),
  allCommunes: ()           => apiGet<Commune[]>('/communes', { per_page: 1600 }),
} as const;

export function useWilayas() {
  return useQuery<Wilaya[]>({
    queryKey: globalKeys.wilayas,
    queryFn:  globalLookupsApi.wilayas,
    staleTime: GLOBAL_STALE,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

export function useCommunes(wilayaId: number | null | undefined) {
  return useQuery<Commune[]>({
    queryKey: globalKeys.communes(wilayaId ?? 0),
    queryFn:  () => globalLookupsApi.communes(wilayaId!),
    staleTime: GLOBAL_STALE,
    enabled:  !!wilayaId,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TENANT Lookups
// كلها تُرسَل مع /{slug}/ تلقائياً عبر الـ interceptor
// ══════════════════════════════════════════════════════════════════════════════

// ─── API functions ────────────────────────────────────────────────────────────
// الـ interceptor يُضيف slug تلقائياً — لا نحتاج تمريره هنا
export const tenantLookupsApi = {
  currencies:          () => apiGet<Currency[]>('/currencies',                    { per_page: 100 }),
  tvas:                () => apiGet<Tva[]>('/tvas',                               { per_page: 50  }),
  units:               () => apiGet<Unit[]>('/units',                             { per_page: 100 }),
  families:            () => apiGet<Family[]>('/families',                        { per_page: 100 }),
  brands:              () => apiGet<Brand[]>('/brands',                           { per_page: 100 }),
  priceLevels:         () => apiGet<PriceLevel[]>('/price-levels',               { per_page: 50  }),
  warehouses:          () => apiGet<Warehouse[]>('/warehouses',                   { per_page: 50  }),
  paymentModes:        () => apiGet<PaymentMode[]>('/payment-modes',              { per_page: 50  }),
  exchangeRates:       () => apiGet<ExchangeRate[]>('/exchange-rates',            { per_page: 50  }),
  expenseCategories:   () => apiGet<ExpenseCategory[]>('/expense-categories',     { per_page: 100 }),
  documentTypes:       () => apiGet<DocumentType[]>('/document-types',            { per_page: 50  }),
  documentStatuses:    () => apiGet<DocumentStatus[]>('/document-statuses',       { per_page: 50  }),
  documentBaseOps:     () => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
  fiscalStamps:        () => apiGet<FiscalStamp[]>('/fiscal-stamps'),
  genders:             () => apiGet<Gender[]>('/genders'),
  legalForms:          () => apiGet<LegalForm[]>('/legal-forms',                 { per_page: 50  }),
  partyTypes:          () => apiGet<PartyType[]>('/party-types',                  { per_page: 50  }),
  productTypes:        () => apiGet<ProductType[]>('/product-types',              { per_page: 50  }),
  treasuryAccountTypes:() => apiGet<TreasuryAccountType[]>('/treasury-account-types'),
  stockMovementTypes:  () => apiGet<StockMovementType[]>('/stock-movement-types'),
  valuationMethods:    () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods'),
  numberingSeries:     () => apiGet<NumberingSeries[]>('/numbering-series',       { per_page: 50  }),
  treasuryAccounts:    () => apiGet<TreasuryAccount[]>('/treasury-accounts',      { per_page: 50  }),
} as const;

// ─── Hook factory ─────────────────────────────────────────────────────────────
function useTenantLookup<T>(
  keyFn: (slug: string) => readonly unknown[],
  apiFn: () => Promise<T[]>,
  enabled = true,
) {
  const slug = useActiveSlug();
  return useQuery<T[]>({
    queryKey: keyFn(slug ?? ''),
    queryFn:  apiFn,
    enabled:  !!slug && enabled,
    staleTime: TENANT_STALE,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export const useCurrencies          = () => useTenantLookup(tenantKeys.lookups.currencies,          tenantLookupsApi.currencies);
export const useTvas                = () => useTenantLookup(tenantKeys.lookups.tvas,                tenantLookupsApi.tvas);
export const useUnits               = () => useTenantLookup(tenantKeys.lookups.units,               tenantLookupsApi.units);
export const useFamilies            = () => useTenantLookup(tenantKeys.lookups.families,            tenantLookupsApi.families);
export const useBrands              = () => useTenantLookup(tenantKeys.lookups.brands,              tenantLookupsApi.brands);
export const usePriceLevels         = () => useTenantLookup(tenantKeys.lookups.priceLevels,         tenantLookupsApi.priceLevels);
export const useWarehouses          = () => useTenantLookup(tenantKeys.lookups.warehouses,          tenantLookupsApi.warehouses);
export const usePaymentModes        = () => useTenantLookup(tenantKeys.lookups.paymentModes,        tenantLookupsApi.paymentModes);
export const useExchangeRates       = () => useTenantLookup(tenantKeys.lookups.exchangeRates,       tenantLookupsApi.exchangeRates);
export const useExpenseCategories   = () => useTenantLookup(tenantKeys.lookups.expenseCategories,   tenantLookupsApi.expenseCategories);
export const useDocumentTypes       = () => useTenantLookup(tenantKeys.lookups.documentTypes,       tenantLookupsApi.documentTypes);
export const useDocumentStatuses    = () => useTenantLookup(tenantKeys.lookups.documentStatuses,    tenantLookupsApi.documentStatuses);
export const useDocumentBaseOps     = () => useTenantLookup(tenantKeys.lookups.documentBaseOps,     tenantLookupsApi.documentBaseOps);
export const useFiscalStamps        = () => useTenantLookup(tenantKeys.lookups.fiscalStamps,        tenantLookupsApi.fiscalStamps);
export const useGenders             = () => useTenantLookup(tenantKeys.lookups.genders,             tenantLookupsApi.genders);
export const useLegalForms          = () => useTenantLookup(tenantKeys.lookups.legalForms,          tenantLookupsApi.legalForms);
export const usePartyTypes          = () => useTenantLookup(tenantKeys.lookups.partyTypes,          tenantLookupsApi.partyTypes);
export const useProductTypes        = () => useTenantLookup(tenantKeys.lookups.productTypes,        tenantLookupsApi.productTypes);
export const useTreasuryAccountTypes= () => useTenantLookup(tenantKeys.lookups.treasuryAccountTypes,tenantLookupsApi.treasuryAccountTypes);
export const useStockMovementTypes  = () => useTenantLookup(tenantKeys.lookups.stockMovementTypes,  tenantLookupsApi.stockMovementTypes);
export const useValuationMethods    = () => useTenantLookup(tenantKeys.lookups.valuationMethods,    tenantLookupsApi.valuationMethods);
export const useNumberingSeries     = () => useTenantLookup(tenantKeys.lookups.numberingSeries,     tenantLookupsApi.numberingSeries);
export const useTreasuryAccounts    = () => useTenantLookup(tenantKeys.lookups.treasuryAccounts,    tenantLookupsApi.treasuryAccounts);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — CRUD Mutations (tenant)
// ══════════════════════════════════════════════════════════════════════════════

type Entity = { id: number };

function useLookupMutations<T extends Entity>(
  resource: string,
  keyFn:    (slug: string) => readonly unknown[],
) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: keyFn(slug) }); };

  return {
    create: useMutation({ mutationFn: (data: Omit<T, 'id'>)                              => apiPost<T>(`/${resource}`, data),           onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<T> })   => apiPut<T>(`/${resource}/${id}`, data),      onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: number)                                        => apiDelete(`/${resource}/${id}`),           onSuccess: inv }),
  };
}

export const useCurrencyMutations         = () => useLookupMutations<Currency>('currencies',                     tenantKeys.lookups.currencies);
export const useTvaMutations              = () => useLookupMutations<Tva>('tvas',                                tenantKeys.lookups.tvas);
export const useUnitMutations             = () => useLookupMutations<Unit>('units',                              tenantKeys.lookups.units);
export const useFamilyMutations           = () => useLookupMutations<Family>('families',                         tenantKeys.lookups.families);
export const useBrandMutations            = () => useLookupMutations<Brand>('brands',                            tenantKeys.lookups.brands);
export const usePriceLevelMutations       = () => useLookupMutations<PriceLevel>('price-levels',                 tenantKeys.lookups.priceLevels);
export const useWarehouseMutations        = () => useLookupMutations<Warehouse>('warehouses',                    tenantKeys.lookups.warehouses);
export const usePaymentModeMutations      = () => useLookupMutations<PaymentMode>('payment-modes',               tenantKeys.lookups.paymentModes);
export const useExchangeRateMutations     = () => useLookupMutations<ExchangeRate>('exchange-rates',             tenantKeys.lookups.exchangeRates);
export const useExpenseCategoryMutations  = () => useLookupMutations<ExpenseCategory>('expense-categories',      tenantKeys.lookups.expenseCategories);
export const useDocumentTypeMutations     = () => useLookupMutations<DocumentType>('document-types',             tenantKeys.lookups.documentTypes);
export const useDocumentStatusMutations   = () => useLookupMutations<DocumentStatus>('document-statuses',        tenantKeys.lookups.documentStatuses);
export const useGenderMutations           = () => useLookupMutations<Gender>('genders',                          tenantKeys.lookups.genders);
export const useLegalFormMutations        = () => useLookupMutations<LegalForm>('legal-forms',                   tenantKeys.lookups.legalForms);
export const useNumberingSeriesMutations  = () => useLookupMutations<NumberingSeries>('numbering-series',        tenantKeys.lookups.numberingSeries);
export const useTreasuryAccountMutations  = () => useLookupMutations<TreasuryAccount>('treasury-accounts',       tenantKeys.lookups.treasuryAccounts);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Composite hooks (للصفحات التي تحتاج عدة lookups)
// ══════════════════════════════════════════════════════════════════════════════

export function useInvoiceLookups() {
  const documentTypes    = useDocumentTypes();
  const documentStatuses = useDocumentStatuses();
  const warehouses       = useWarehouses();
  const paymentModes     = usePaymentModes();
  const treasuryAccounts = useTreasuryAccounts();
  const tvas             = useTvas();
  const currencies       = useCurrencies();

  return {
    documentTypes:    documentTypes.data    ?? [],
    documentStatuses: documentStatuses.data ?? [],
    warehouses:       warehouses.data       ?? [],
    paymentModes:     paymentModes.data     ?? [],
    treasuryAccounts: treasuryAccounts.data ?? [],
    tvas:             tvas.data             ?? [],
    currencies:       currencies.data       ?? [],
    isLoading: documentTypes.isLoading || warehouses.isLoading,
  };
}

export function useProductLookups() {
  const families     = useFamilies();
  const brands       = useBrands();
  const units        = useUnits();
  const tvas         = useTvas();
  const priceLevels  = usePriceLevels();
  const warehouses   = useWarehouses();
  const productTypes = useProductTypes();

  return {
    families:     families.data     ?? [],
    brands:       brands.data       ?? [],
    units:        units.data        ?? [],
    tvas:         tvas.data         ?? [],
    priceLevels:  priceLevels.data  ?? [],
    warehouses:   warehouses.data   ?? [],
    productTypes: productTypes.data ?? [],
    isLoading: families.isLoading || units.isLoading,
  };
}

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
    isLoading: partyTypes.isLoading,
  };
}
