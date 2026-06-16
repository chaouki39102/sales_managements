// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentLookups.ts
//
// يجمع كل useQuery الخاصة بـ Modal في مكان واحد.
// ✅ محدَّث: إضافة treasury_accounts
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type {
  Product,
  Party,
  PaymentMode,
  TreasuryAccount,
} from '../types/document.types';

// ─── Generic extractor ───────────────────────────────────────────────────────

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDocumentLookupsOptions {
  open:       boolean;
  isPurchase: boolean;
  needsParty: boolean;
  warehouseId?: number | null;
  fiscalYearId?: number | null;
}

export function useDocumentLookups({
  open,
  isPurchase,
  needsParty,
  warehouseId,
  fiscalYearId,
}: UseDocumentLookupsOptions) {

  const slug = useActiveSlug();

  // ── Parties ──────────────────────────────────────────────────────────────────

  const { data: partiesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-parties', isPurchase],
    queryFn:   () => apiGet<unknown>(
      isPurchase ? '/suppliers' : '/customers',
      { per_page: 1000, include: 'priceLevel' },
    ).then(extractList),
    enabled:   open && needsParty && !!slug,
    staleTime: 5 * 60_000,
  });
  const parties = partiesRaw as Party[];

  // ── Products ─────────────────────────────────────────────────────────────────

  const { data: productsRaw = [], isLoading: isLoadingProducts } = useQuery({
    queryKey:  [slug, 'modal-products-v2'],
    queryFn:   () => apiGet<unknown>('/products', {
      per_page: 2000,
      include:  'unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots',
      active:   1,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 3 * 60_000,
  });
  const products = productsRaw as Product[];

  // ── Warehouses ───────────────────────────────────────────────────────────────

  const { data: warehousesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-warehouses'],
    queryFn:   () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const warehouses = warehousesRaw as Record<string, unknown>[];

  // ── Currencies ───────────────────────────────────────────────────────────────

  const { data: currenciesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-currencies'],
    queryFn:   () => apiGet<unknown>('/currencies', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const currencies = currenciesRaw as Record<string, unknown>[];

  // ── Fiscal Years ─────────────────────────────────────────────────────────────

  const { data: fiscalYearsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-fiscal-years'],
    queryFn:   () => apiGet<unknown>('/fiscal-years', {
      per_page:           20,
      'filter[is_closed]': 0,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });
  const fiscalYears = fiscalYearsRaw as Record<string, unknown>[];

  // ── Payment modes ────────────────────────────────────────────────────────────

  const { data: paymentModesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-payment-modes'],
    queryFn:   () => apiGet<unknown>('/payment-modes', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const paymentModes = paymentModesRaw as PaymentMode[];

  // ── Price levels ─────────────────────────────────────────────────────────────

  const { data: priceLevelsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-price-levels'],
    queryFn:   () => apiGet<unknown>('/price-levels', { per_page: 100 }).then(extractList),
    enabled:   open && !isPurchase && !!slug,
    staleTime: 30 * 60_000,
  });
  const priceLevels = priceLevelsRaw as Record<string, unknown>[];

  // ── Treasury Accounts ────────────────────────────────────────────────────────

  const { data: treasuryAccountsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-treasury-accounts'],
    queryFn:   () => apiGet<unknown>('/treasury-accounts', {
      per_page: 100,
      'filter[is_active]': 1,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const treasuryAccounts = treasuryAccountsRaw as TreasuryAccount[];

  // ── Real-time stock ──────────────────────────────────────────────────────────

  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseId, fiscalYearId],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseId,
        fiscal_year_id: fiscalYearId,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseId,
    staleTime: 2 * 60_000,
  });

  // ── Derived defaults ─────────────────────────────────────────────────────────

  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find((w) => w.is_default) ?? warehouses[0];
    return dw ? String(dw.id) : '';
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = currencies.find((c) => c.is_base_currency) ?? currencies[0];
    return base ? String(base.id) : '';
  }, [currencies]);

  const defaultTvaRate = useMemo(() => {
    const p = products.find((pr) => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  return {
    parties,
    products,
    warehouses,
    currencies,
    fiscalYears,
    paymentModes,
    priceLevels,
    treasuryAccounts,
    stockData,
    isLoadingProducts,
    defaultWarehouseId,
    baseCurrencyId,
    defaultTvaRate,
  };
}
