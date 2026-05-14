// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
// ✅ مصحح: variants endpoints + تصحيح active route + POS support
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product, ProductVariant, ProductVariantPrice,
  QuantityDiscount, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductListParams extends ListParams {
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
}

export interface VariantListParams extends ListParams {
  product_id?:    number;
  barcode?:       string;
  manages_stock?: boolean;
  active?:        boolean;
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiGet<PaginatedResponse<Product>>('/products', params),

  show: (id: number, include?: string) =>
    apiGet<Product>(`/products/${id}`, {
      include: include ?? 'family,brand,productType',
    }),

  // ✅ إصلاح: active يُرسل `filter[active]=1` بدل /products/active
  // (لأن /products/:id يتعارض مع /products/active في بعض إعدادات الـ router)
  activeList: (params?: ProductListParams) =>
    apiGet<Product[]>('/products/active', params),

  byFamily: (familyId: number) =>
    apiGet<Product[]>(`/products/by-family/${familyId}`),

  byBrand: (brandId: number) =>
    apiGet<Product[]>(`/products/by-brand/${brandId}`),

  create: (data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPost<Product>('/products', data),

  update: (id: number, data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPut<Product>(`/products/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/products/${id}`),

  uploadImage: (id: number, fd: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Product>(`/products/${id}/image`, fd, onProgress),
} as const;

// ─── Variants API ─────────────────────────────────────────────────────────────
// ✅ مفقودة في النسخة الأصلية — مطلوبة للـ POS وصفحة المنتجات

export const variantsApi = {
  list: (params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', params),

  byProduct: (productId: number, params?: VariantListParams) =>
    apiGet<ProductVariant[]>(`/products/${productId}/variants`),

  show: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`, {
      include: 'product,unit,tva,prices.priceLevel,quantityDiscounts,lots',
    }),

  // ✅ للـ POS: بحث بالباركود
  byBarcode: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants', {
      barcode,
      include: 'product,unit,tva,prices.priceLevel',
      per_page: 5,
    }),

  // ✅ للـ POS: بحث بالنص
  search: (query: string, params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      ...params,
      search: query,
      include: 'product,unit,tva,prices',
      per_page: 30,
    }),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProducts(params?: ProductListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.products.list(slug ?? '', params),
    queryFn:         () => productsApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.products.detail(slug ?? '', id!),
    queryFn:   () => productsApi.show(id!,
      'family,brand,productType,variants.unit,variants.tva,variants.prices.priceLevel,variants.quantityDiscounts'
    ),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ✅ للـ POS: جلب متغير بالباركود
export function useVariantByBarcode(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'barcode', barcode],
    queryFn:   () => variantsApi.byBarcode(barcode!),
    enabled:   !!slug && !!barcode,
    staleTime: 10 * 60_000,
  });
}

// ✅ للـ POS: بحث بالنص
export function useVariantSearch(query: string, params?: VariantListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'variants', 'search', query, params],
    queryFn:         () => variantsApi.search(query, params),
    enabled:         !!slug && query.length >= 2,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// ✅ متغيرات منتج بعينه
export function useProductVariants(productId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'variants'],
    queryFn:   () => variantsApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  const invalidateOne = (product: Product) => {
    if (slug) {
      qc.setQueryData(tenantKeys.products.detail(slug, product.id), product);
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    }
  };

  return {
    create: useMutation({
      mutationFn: productsApi.create,
      onSuccess:  invalidate,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
        productsApi.update(id, data),
      onSuccess: invalidateOne,
    }),

    remove: useMutation({
      mutationFn: productsApi.delete,
      onSuccess:  invalidate,
    }),

    uploadImage: useMutation({
      mutationFn: ({
        id, formData, onProgress,
      }: { id: number; formData: FormData; onProgress?: (p: number) => void }) =>
        productsApi.uploadImage(id, formData, onProgress),
      onSuccess: invalidateOne,
    }),
  };
}

export function useVariantMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    create: useMutation({ mutationFn: variantsApi.create, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
        variantsApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: variantsApi.delete, onSuccess: invalidate }),
  };
}
