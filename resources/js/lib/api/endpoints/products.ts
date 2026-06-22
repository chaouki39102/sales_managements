// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
//
// ✅ يغطي:
//   - variantsApi.list()       — تصفح المنتجات في POS (مع include كامل)
//   - variantsApi.search()     — بحث بالاسم / الباركود
//   - useVariantSearch()       — hook بحث (مُفعَّل عند length >= 2)
//   - useProducts / useProduct — صفحات إدارة المنتجات
//   - useProductMutations / useVariantMutations
//
// ⚠️  الـ interceptor يُضيف /{slug}/ تلقائياً — لا نمرره هنا
// ════════════════════════════════════════════════════════════════════════════

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product,
  ProductVariant,
  ProductVariantPrice,
  QuantityDiscount,
  ProductLot,
  PaginatedResponse,
  ListParams,
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

// ─── Include string للـ POS ───────────────────────────────────────────────────
// يجلب كل ما يحتاجه ProductCard + useCartStore.addItem
// ✅ أُضيف prices.priceLevel: بدونها لا يمكن لصفحة POS تطبيق مستويات
//    السعر (تجزئة/نصف جملة/جملة) — كان الزر موجوداً في الواجهة بدون أي بيانات يعمل بها
const POS_VARIANT_INCLUDE =
  'product,product.family,unit,tva,prices.priceLevel';

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiGet<PaginatedResponse<Product>>('/products', {
      include: 'family,brand,productType',
      ...params,
    }),

  show: (id: number, include?: string) =>
    apiGet<Product>(`/products/${id}`, {
      include: include ??
        'family,brand,productType,variants.unit,variants.tva,variants.prices.priceLevel,variants.quantityDiscounts',
    }),

  activeList: (params?: ProductListParams) =>
    apiGet<Product[]>('/products/active', { include: 'family,brand', ...params }),

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

export const variantsApi = {
  /**
   * قائمة كاملة — للـ POS browse mode
   * include: product, product.family (للفلترة بالتصنيف), unit, tva
   */
  list: (params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      per_page:  200,
      include:   POS_VARIANT_INCLUDE,
      active:    true,
      ...params,
    }),

  /**
   * بحث بالاسم أو الباركود — للـ POS search bar
   */
  search: (query: string, params?: Omit<VariantListParams, 'search'>) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      per_page: 60,
      include:  POS_VARIANT_INCLUDE,
      active:   true,
      search:   query,
      ...params,
    }),

  /**
   * بحث بالباركود فقط — للماسح الضوئي
   */
  byBarcode: (barcode: string) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      barcode,
      include:  POS_VARIANT_INCLUDE,
      per_page: 5,
      active:   true,
    }),

  /**
   * متغيرات منتج واحد
   */
  byProduct: (productId: number) =>
    apiGet<ProductVariant[]>(`/products/${productId}/variants`, {
      include: POS_VARIANT_INCLUDE,
    }),

  show: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`, {
      include:
        'product,product.family,unit,tva,prices.priceLevel,quantityDiscounts,lots',
    }),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),
} as const;

// ─── Hooks — Products ─────────────────────────────────────────────────────────

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
    queryFn:   () => productsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Hooks — Variants ─────────────────────────────────────────────────────────

/**
 * قائمة المتغيرات — تصفح POS (browse mode)
 * مُفعَّل دائماً عندما يكون هناك slug
 */
export function useVariants(params?: VariantListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'variants', 'list', params],
    queryFn:         () => variantsApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * بحث المتغيرات — POS search bar
 * مُفعَّل فقط عند query.length >= 2
 */
export function useVariantSearch(
  query: string,
  params?: Omit<VariantListParams, 'search'>,
) {
  const slug    = useActiveSlug();
  const enabled = !!slug && query.trim().length >= 2;

  return useQuery({
    queryKey:        [slug, 'variants', 'search', query.trim(), params],
    queryFn:         () => variantsApi.search(query.trim(), params),
    enabled,
    staleTime:       30_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * بحث بالباركود — ماسح ضوئي
 */
export function useVariantByBarcode(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'barcode', barcode],
    queryFn:   () => variantsApi.byBarcode(barcode!),
    enabled:   !!slug && !!barcode && barcode.length > 0,
    staleTime: 10 * 60_000,
  });
}

/**
 * متغيرات منتج واحد
 */
export function useProductVariants(productId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'variants'],
    queryFn:   () => variantsApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 5 * 60_000,
  });
}

/**
 * تفاصيل متغير واحد
 */
export function useVariant(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'detail', id],
    queryFn:   () => variantsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
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
      onSuccess:  invalidateAll,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
        productsApi.update(id, data),
      onSuccess: invalidateOne,
    }),

    remove: useMutation({
      mutationFn: productsApi.delete,
      onSuccess:  invalidateAll,
    }),

    uploadImage: useMutation({
      mutationFn: ({
        id,
        formData,
        onProgress,
      }: {
        id:          number;
        formData:    FormData;
        onProgress?: (p: number) => void;
      }) => productsApi.uploadImage(id, formData, onProgress),
      onSuccess: invalidateOne,
    }),
  };
}

export function useVariantMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (slug) {
      // إبطال المنتجات أيضاً — المتغيرات مرتبطة بها في الكاش
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      qc.invalidateQueries({ queryKey: [slug, 'variants'] });
    }
  };

  return {
    create: useMutation({
      mutationFn: variantsApi.create,
      onSuccess:  invalidateAll,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
        variantsApi.update(id, data),
      onSuccess: invalidateAll,
    }),

    remove: useMutation({
      mutationFn: variantsApi.delete,
      onSuccess:  invalidateAll,
    }),
  };
}
