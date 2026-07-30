import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

export interface TvaRate {
  rate: number;
  label: string;
}

export interface TimbreBaremeItem {
  from_amount: number;
  to_amount: number | null;
  rate: number;
  type: string;
  amount: number | null;
}

/** @deprecated Kept for ifuSettings endpoint. Use IfuDocumentSource instead. */
export interface IFUCategoryConfig {
  document_codes: string[];
  require_locked: boolean;
  base: 'purchases' | 'margin' | 'revenue';
}

/** @deprecated Kept for ifuSettings endpoint. Use TaxConfig instead. */
export interface IFUSettings {
  ifu_source_document_types: {
    subsidized: IFUCategoryConfig;
    other_goods: IFUCategoryConfig;
    services: IFUCategoryConfig;
  };
  ifu_require_locked: boolean;
  ifu_period_type: 'annual' | 'monthly';
  ifu_rate_subsidized: number | null;
  ifu_rate_goods: number;
  ifu_rate_services: number;
  ifu_rate_auto: number;
  ifu_minimum: number;
  ifu_minimum_auto: number;
}

export interface IfuDocumentSource {
  category: 'subsidized' | 'other_goods' | 'services';
  base: 'purchases' | 'margin' | 'revenue';
  require_locked: boolean;
  document_codes: string[];
}

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  name_latin: string;
  document_base_operation_id: number;
  operation?: 'purchase' | 'sale';
}

export interface TaxConfig {
  id: number;
  company_id: number;
  regime: 'forfaitaire' | 'reel';
  tva_rates?: TvaRate[];
  timbre_bareme?: TimbreBaremeItem[];
  ifu_document_sources?: IfuDocumentSource[];
  g50_deadline_day?: number;
  ifu_rate_goods?: number;
  ifu_rate_services?: number;
  ifu_rate_auto?: number;
  ifu_rate_subsidized?: number | null;
  ifu_minimum?: number;
  ifu_minimum_auto?: number;
  ifu_ca_threshold?: number;
  ifu_require_locked?: boolean;
  ifu_period_type?: string;
  g12_previsionnel_deadline?: string;
  g12_definitif_deadline?: string;
  g12_tranche1_pct?: number;
  g12_tranche2_pct?: number;
  g12_tranche3_pct?: number;
  g12_tranche2_deadline?: string;
  g12_tranche3_deadline?: string;
  timbre_fiscal_electronic_exempt?: boolean;
  is_active?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegulatedProduct {
  id: number;
  company_id: number;
  product_key: string;
  label: string;
  unit_label: string;
  category: string;
  regulated_max_price: number;
  regulated_margin?: number;
  regulation_type: 'price' | 'margin';
  legal_reference?: string;
  effective_date?: string;
  active: boolean;
  notes?: string;
}

export interface SubsidizedSalesSummary {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  month?: number;
  product_key: string;
  product_label: string;
  qty_sold: number;
  weighted_avg_sell_price: number;
  pmp: number;
  total_revenue: number;
  total_purchase_cost: number;
  margin: number;
  ifu_due: number;
  price_violation: boolean;
  computed_at: string;
}

export interface SubsidizedSalesResult {
  summaries: SubsidizedSalesSummary[];
  totals: {
    total_qty: number;
    total_margin: number;
    total_ifu: number;
    violations_count?: number;
  };
}

export interface TaxDeclarationPeriod {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  form_type: 'g50' | 'g12' | 'g12bis';
  month?: number;
  year?: number;
  tva_collectee?: number;
  tva_deductible?: number;
  tva_carry_fwd?: number;
  tva_net?: number;
  tva_due?: number;
  timbre_fiscal?: number;
  ifu_subsidized?: number;
  ifu_other?: number;
  ifu_total?: number;
  ifu_minimum?: number;
  amount_due: number;
  amount_paid?: number;
  status: 'draft' | 'submitted' | 'paid';
  notes?: string;
  created_by?: number;
  filed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IFUDeclaration {
  subsidized: {
    rows:           SubsidizedSalesSummary[];
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  other_goods: {
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  services: {
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  config_info: {
    subsidized:  { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
    other_goods: { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
    services:    { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
  };
  summary: {
    ifu_subsidized: number;
    ifu_other:      number;
    ifu_services:   number;
    ifu_auto:       number;
    ifu_total:      number;
    ifu_minimum:    number;
    ifu_due:        number;
  };
  payment_schedule: {
    tranche1_pct:      number;
    tranche1_amount:   number;
    tranche1_deadline: string;
    tranche2_pct:      number;
    tranche2_amount:   number;
    tranche2_deadline: string;
    tranche3_pct:      number;
    tranche3_amount:   number;
    tranche3_deadline: string;
    g12bis_deadline:   string;
  };
  fiscal_year_id: number;
  // Flattened fields for backward compat
  ifu_subsidized?: number;
  ifu_other?:      number;
  ifu_total?:      number;
  ifu_minimum?:    number;
  amount_due?:     number;
  status?:         'draft' | 'submitted' | 'paid';
}

export const taxManagementApi = {
  // ── Tax Configuration ────────────────────────────────────
  getConfig: (regime: string) =>
    apiGet<TaxConfig>(`/tax-config/${regime}`),

  updateConfig: (regime: string, data: Record<string, unknown>) =>
    apiPut<TaxConfig>(`/tax-config/${regime}`, data),

  getConfigHistory: (regime: string) =>
    apiGet<TaxConfig[]>(`/tax-config/${regime}/history`),

  getIFUSettings: () =>
    apiGet<IFUSettings>('/tax-config/ifu-settings'),

  // ── Regulated Products ──────────────────────────────────
  getRegulatedProducts: (activeOnly = true) =>
    apiGet<RegulatedProduct[]>('/regulated-products', { active_only: activeOnly }),

  createRegulatedProduct: (data: Partial<RegulatedProduct>) =>
    apiPost<RegulatedProduct>('/regulated-products', data),

  updateRegulatedProduct: (id: number, data: Partial<RegulatedProduct>) =>
    apiPut<RegulatedProduct>(`/regulated-products/${id}`, data),

  toggleRegulatedProduct: (id: number) =>
    apiPatch<RegulatedProduct>(`/regulated-products/${id}/toggle`),

  deleteRegulatedProduct: (id: number) =>
    apiDelete(`/regulated-products/${id}`),

  seedDefaultRegulatedProducts: () =>
    apiPost<{ message: string }>('/regulated-products/seed-defaults'),

  // ── Subsidized Sales ────────────────────────────────────
  getSubsidizedSummary: (fiscalYearId: number, month?: number) =>
    apiGet<SubsidizedSalesResult>('/subsidized-sales/summary', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  computeSubsidizedSales: (fiscalYearId: number, month?: number) =>
    apiPost<SubsidizedSalesResult>('/subsidized-sales/compute', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  getSubsidizedViolations: (fiscalYearId: number) =>
    apiGet<SubsidizedSalesSummary[]>('/subsidized-sales/violations', {
      fiscal_year_id: fiscalYearId,
    }),

  updateSubsidizedRow: (id: number, data: Partial<SubsidizedSalesSummary>) =>
    apiPut<SubsidizedSalesSummary>(`/subsidized-sales/${id}`, data),

  deleteSubsidizedRow: (id: number) =>
    apiDelete(`/subsidized-sales/${id}`),

  // ── G50 Declaration ────────────────────────────────────
  getG50Declaration: (fiscalYearId: number, month: number) =>
    apiGet<Record<string, unknown>>('/g50-declaration', {
      fiscal_year_id: fiscalYearId,
      month,
    }),

  saveG50Period: (data: Partial<TaxDeclarationPeriod>) =>
    apiPost<TaxDeclarationPeriod>('/g50-declaration/save-period', data),

  getG50History: (fiscalYearId: number) =>
    apiGet<TaxDeclarationPeriod[]>('/g50-declaration/history', {
      fiscal_year_id: fiscalYearId,
    }),

  // ── IFU Declaration ────────────────────────────────────
  getIFUDeclaration: (fiscalYearId: number, month?: number) =>
    apiGet<IFUDeclaration>('/ifu-declaration', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  saveIFUPeriod: (data: Partial<TaxDeclarationPeriod>) =>
    apiPost<TaxDeclarationPeriod>('/ifu-declaration/save-period', data),

  getIFUHistory: (fiscalYearId: number) =>
    apiGet<TaxDeclarationPeriod[]>('/ifu-declaration/history', {
      fiscal_year_id: fiscalYearId,
    }),
} as const;

// ─── Query Hooks ────────────────────────────────────────────

export function useTaxConfig(regime: string) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.detail(slug ?? '', regime),
    queryFn: () => taxManagementApi.getConfig(regime),
    enabled: !!slug && !!regime,
    staleTime: 5 * 60_000,
  });
}

export function useTaxConfigHistory(regime: string) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.history(slug ?? '', regime),
    queryFn: () => taxManagementApi.getConfigHistory(regime),
    enabled: !!slug && !!regime,
    staleTime: 5 * 60_000,
  });
}

export function useRegulatedProducts(activeOnly = true) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.regulatedProducts.list(slug ?? '', { active_only: activeOnly }),
    queryFn: () => taxManagementApi.getRegulatedProducts(activeOnly),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useSubsidizedSummary(fiscalYearId: number | null, month?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.subsidizedSales.summary(slug ?? '', fiscalYearId ?? 0, month),
    queryFn: () => taxManagementApi.getSubsidizedSummary(fiscalYearId!, month),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useSubsidizedViolations(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.subsidizedSales.violations(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getSubsidizedViolations(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useG50Declaration(fiscalYearId: number | null, month: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.g50Declaration.detail(slug ?? '', fiscalYearId ?? 0, month ?? 0),
    queryFn: () => taxManagementApi.getG50Declaration(fiscalYearId!, month!),
    enabled: !!slug && !!fiscalYearId && !!month,
    staleTime: 5 * 60_000,
    select: (data: Record<string, unknown>): any => ({
      ...data,
      amount_due: data.total_due,
      timbre_fiscal: data.timbre_total,
    }),
  });
}

export function useG50History(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.g50Declaration.history(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getG50History(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useIFUDeclaration(fiscalYearId: number | null, month?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.ifuDeclaration.detail(slug ?? '', fiscalYearId ?? 0, month),
    queryFn: () => taxManagementApi.getIFUDeclaration(fiscalYearId!, month),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
    select: (data: IFUDeclaration) => ({
      ...data,
      ifu_subsidized: data.summary?.ifu_subsidized,
      ifu_other:      data.summary?.ifu_other,
      ifu_total:      data.summary?.ifu_total,
      ifu_minimum:    data.summary?.ifu_minimum,
      amount_due:     data.summary?.ifu_due,
    }) as IFUDeclaration & {
      ifu_subsidized: number | undefined;
      ifu_other: number | undefined;
      ifu_total: number | undefined;
      ifu_minimum: number | undefined;
      amount_due: number | undefined;
    },
  });
}

export function useIFUSettings() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.detail(slug ?? '', 'forfaitaire'),
    queryFn: () => taxManagementApi.getIFUSettings(),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useDocumentTypes(operation?: 'purchase' | 'sale' | 'transfer') {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [...(slug ? [slug] : ['']), 'document-types', operation],
    queryFn: () => apiGet<DocumentType[]>('/document-types', operation ? { operation } : {}),
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });
}

export function useIFUHistory(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.ifuDeclaration.history(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getIFUHistory(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useTaxManagementMutations() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const inv = (keys: readonly unknown[]) => { if (slug) qc.invalidateQueries({ queryKey: keys, refetchType: 'active' }); };

  return {
    updateConfig: useMutation({
      mutationFn: ({ regime, data }: { regime: string; data: Record<string, unknown> }) =>
        taxManagementApi.updateConfig(regime, data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'tax-config'] });
      },
    }),

    createRegulatedProduct: useMutation({
      mutationFn: (data: Partial<RegulatedProduct>) =>
        taxManagementApi.createRegulatedProduct(data),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    updateRegulatedProduct: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<RegulatedProduct> }) =>
        taxManagementApi.updateRegulatedProduct(id, data),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    toggleRegulatedProduct: useMutation({
      mutationFn: (id: number) => taxManagementApi.toggleRegulatedProduct(id),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    deleteRegulatedProduct: useMutation({
      mutationFn: (id: number) => taxManagementApi.deleteRegulatedProduct(id),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    seedDefaults: useMutation({
      mutationFn: () => taxManagementApi.seedDefaultRegulatedProducts(),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    computeSubsidizedSales: useMutation({
      mutationFn: ({ fiscalYearId, month }: { fiscalYearId: number; month?: number }) =>
        taxManagementApi.computeSubsidizedSales(fiscalYearId, month),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    updateSubsidizedRow: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<SubsidizedSalesSummary> }) =>
        taxManagementApi.updateSubsidizedRow(id, data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    deleteSubsidizedRow: useMutation({
      mutationFn: (id: number) => taxManagementApi.deleteSubsidizedRow(id),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    saveG50Period: useMutation({
      mutationFn: (data: Partial<TaxDeclarationPeriod>) =>
        taxManagementApi.saveG50Period(data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'g50'] });
      },
    }),

    saveIFUPeriod: useMutation({
      mutationFn: (data: Partial<TaxDeclarationPeriod>) =>
        taxManagementApi.saveIFUPeriod(data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'ifu'] });
      },
    }),
  };
}
