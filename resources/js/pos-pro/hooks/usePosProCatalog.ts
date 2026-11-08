// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProCatalog.ts
//
// POS PRO catalogue (desktop + mobile share the same query keys → shared
// cache): all active products in one request (filtering is local), their
// stock in the active warehouse, the variants with stock, the variants shown
// in the product grid (out-of-stock hidden like the classic POS — barcode
// adds are not affected) and the families.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints/products';
import { apiGet } from '@/lib/api/core/client';
import { productToVariant } from '@/pos/utils/posHelpers';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type { Product, ProductVariant } from '@/types';

export function usePosProCatalog(params: {
  slug: string | null;
  warehouseId: number | null | undefined;
  fiscalYearId: number | undefined;
  hideOutOfStock: boolean;
  allowNegSetting: boolean;
}) {
  const { slug, warehouseId, fiscalYearId, hideOutOfStock, allowNegSetting } = params;

  // ── المنتجات (كلها دفعة واحدة — الفلترة محلية) ───────────────────────────
  const { data: productsRaw, isLoading: productsLoading } = useQuery({
    queryKey: [slug, 'pos-pro', 'products', { perPage: 2000, pos: 1 }],
    queryFn: () => productsApi.list({
      per_page: 2000,
      simple: 1,
      pos: 1,
      include: 'tva,unit,family,prices,quantityDiscounts,packagings,barcodes',
      filter: { active: 1 },
    }),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });

  const rawProducts = useMemo(() => (
    Array.isArray(productsRaw)
      ? productsRaw
      : (productsRaw as PaginatedResponse<Product>)?.data ?? []
  ), [productsRaw]);

  // ── المخزون (عبر stock-at) ────────────────────────────────────────────────
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-pro-stock', warehouseId ?? null, fiscalYearId],
    queryFn: () =>
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
    staleTime: 60_000,
  });

  const allVariants: ProductVariant[] = useMemo(() =>
    rawProducts.map(p => {
      const v = productToVariant(p);
      const stock = stockData[p.id];
      if (stock !== undefined) v.current_stock = stock;
      return v;
    }),
    [rawProducts, stockData],
  );

  // إخفاء النافد من الشبكة (مثل POS الكلاسيكي) — لا يمنع الإضافة عبر الباركود
  const visibleVariants: ProductVariant[] = useMemo(() => {
    if (!hideOutOfStock || allowNegSetting) return allVariants;
    return allVariants.filter(v =>
      !v.manages_stock || v.current_stock === undefined || v.current_stock > 0,
    );
  }, [allVariants, hideOutOfStock, allowNegSetting]);

  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  return { productsLoading, allVariants, visibleVariants, families };
}
