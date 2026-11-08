// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosCatalog.ts
//
// POSPage catalogue: all products of the current category (no search text —
// search is filtered locally), their stock in the active warehouse, and the
// derived variants / packagings / families.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints/products';
import { apiGet } from '@/lib/api/core/client';
import { productToVariant } from '@/pos/utils/posHelpers';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type { Product, ProductVariant, ProductPackaging } from '@/types';

export function usePosCatalog(params: {
  slug: string | null;
  selectedCategory: number | null;
  queryFamilyId: number | undefined;
  filterPerPage: number;
  effectiveWarehouseId: number | null;
  fiscalYearId: number | undefined;
}) {
  const { slug, selectedCategory, queryFamilyId, filterPerPage, effectiveWarehouseId, fiscalYearId } = params;

  // ── Products query (كل منتجات التصنيف الحالي — بدون نص البحث إطلاقاً) ───
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', { cat: selectedCategory, perPage: filterPerPage }],
    queryFn: () => productsApi.list({
      per_page:  filterPerPage,
      simple:    1,
      include:   'tva,unit,family,prices,quantityDiscounts,packagings,barcodes',
      filter:    { active: 1, ...(queryFamilyId ? { family_id: queryFamilyId } : {}) },
    }),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
  });

  const rawProducts = useMemo(() => (
    Array.isArray(productsRaw)
      ? productsRaw
      : (productsRaw as PaginatedResponse<Product>)?.data ?? []
  ), [productsRaw]);

  // ── Stock (حسب التصنيف فقط — بدون نص البحث، لنفس سبب استعلام المنتجات) ──
  const { data: stockData = {}, isLoading: stockLoading } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-stock', effectiveWarehouseId, fiscalYearId, { family_id: queryFamilyId }],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   effectiveWarehouseId,
        fiscal_year_id: fiscalYearId,
        ...(queryFamilyId ? { family_id: queryFamilyId } : {}),
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!effectiveWarehouseId,
    staleTime: 10_000,
  });
  // True while stock is still unresolved for the first time — used by ProductGrid
  // to avoid flashing products as "available" before we actually know their stock.
  const stockPending = !!effectiveWarehouseId && stockLoading;

  const allVariants: ProductVariant[] = useMemo(() =>
    rawProducts.map(p => {
      const v = productToVariant(p);
      const stock = stockData[p.id];
      if (stock !== undefined) v.current_stock = stock;
      return v;
    }),
    [rawProducts, stockData],
  );

  const packagingsMap = useMemo(() => {
    const map = new Map<number, ProductPackaging[]>();
    for (const v of allVariants) {
      const pkgs = v.packagings ?? (v.product as any)?.packagings;
      if (pkgs?.length) map.set(v.id, pkgs.filter((p: ProductPackaging) => p.active !== false));
    }
    return map;
  }, [allVariants]);

  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  const familyCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of allVariants) {
      const fid = v.product?.family?.id;
      if (fid != null) map.set(fid, (map.get(fid) ?? 0) + 1);
    }
    return map;
  }, [allVariants]);

  return { loadingAll, stockPending, allVariants, packagingsMap, families, familyCounts };
}
