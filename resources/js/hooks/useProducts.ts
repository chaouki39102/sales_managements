// ════════════════════════════════════════════════
// hooks/useProducts.ts
// ════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, variantsApi } from '@/lib/api';
import type { ProductFilters } from '@/lib/api/products';
import type { Product, ProductVariant } from '@/types';

export const PRODUCTS_KEYS = {
  all:         ['products'] as const,
  list:        (filters: ProductFilters) => ['products', 'list', filters] as const,
  detail:      (id: number) => ['products', id] as const,
  variants:    ['product-variants'] as const,
  variantList: (filters: object) => ['product-variants', 'list', filters] as const,
  lowStock:    ['product-variants', 'low-stock'] as const,
};

// ── Products ──────────────────────────────────────
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.list(filters),
    queryFn:  () => productsApi.list(filters).then(r => r.data),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.detail(id),
    queryFn:  () => productsApi.get(id).then(r => r.data.data),
    enabled:  !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => productsApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      productsApi.update(id, data).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.all });
      qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.all }),
  });
}

// ── Variants ──────────────────────────────────────
export function useVariants(filters: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.variantList(filters),
    queryFn:  () => variantsApi.list(filters).then(r => r.data),
  });
}

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductVariant>) => variantsApi.create(data).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.variants }),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
      variantsApi.update(id, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEYS.variants }),
  });
}

export function useLowStockVariants() {
  return useQuery({
    queryKey: PRODUCTS_KEYS.lowStock,
    queryFn:  () => variantsApi.getLowStock().then(r => r.data.data),
    staleTime: 30_000,
  });
}

// ── Barcode search (for POS) ──────────────────────
export function useVariantByBarcode(barcode: string) {
  return useQuery({
    queryKey: ['variant', 'barcode', barcode],
    queryFn:  () => variantsApi.getByBarcode(barcode).then(r => r.data.data[0] ?? null),
    enabled:  barcode.length > 3,
    staleTime: 5 * 60_000,
  });
}
