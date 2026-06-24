// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/productsEnhanced.ts
// 
// تحسينات API للبحث الذكي والفئات
// ✅ جلب جميع الفئات بدون تصفية
// ✅ بحث ذكي مع معاملات متقدمة
// ✅ تصفية حسب الفئة مع البحث
// ✅ حصول على أفضل المنتجات (trending/popular)
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product,
  ProductVariant,
  Family,
  PaginatedResponse,
} from '../core/types';

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface FamilyWithStats extends Family {
  _count?: {
    products: number;
    active_products?: number;
  };
}

export interface SmartSearchParams {
  /** كلمة البحث */
  query: string;
  /** معرّف الفئة (اختياري) */
  family_id?: number;
  /** نطاق السعر من */
  price_from?: number;
  /** نطاق السعر إلى */
  price_to?: number;
  /** فقط المنتجات المتاحة */
  in_stock?: boolean;
  /** الترتيب: popularity, rating, price, newest */
  sort?: 'popularity' | 'rating' | 'price' | 'newest' | 'name';
  /** عدد النتائج */
  per_page?: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const productsEnhancedApi = {
  /**
   * جلب جميع الفئات بإحصائيات
   * ✅ يُعيد جميع الفئات المفعلة مع عدد المنتجات
   */
  getAllFamilies: () =>
    apiGet<FamilyWithStats[]>('/families', {
      active: true,
      include: '_count',
      per_page: 1000,
      sort: 'display_order,name',
    }),

  /**
   * بحث ذكي متقدم
   * يُدعم:
   * - البحث النصي
   * - التصفية حسب الفئة
   * - التصفية حسب السعر
   * - الترتيب الذكي
   */
  smartSearch: (params: SmartSearchParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants/search', {
      search: params.query,
      'filter[family_id]': params.family_id,
      'filter[price_range]': params.price_from && params.price_to
        ? `${params.price_from},${params.price_to}`
        : undefined,
      'filter[in_stock]': params.in_stock,
      sort: params.sort || 'popularity',
      per_page: params.per_page || 50,
      include: 'product,product.family,unit,tva,prices.priceLevel',
      active: true,
    }),

  /**
   * بحث بالباركود مع تشابه ضبابي
   * يُدعم الأخطاء الإملائية الصغيرة
   */
  barcodeSearch: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants/barcode-search', {
      barcode,
      include: 'product,product.family,unit,tva,prices.priceLevel',
      active: true,
    }),

  /**
   * المنتجات الشعبية/الأكثر طلباً
   */
  trending: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/trending', {
      family_id: familyId,
      limit: 20,
      include: 'product,product.family,unit,tva,prices.priceLevel',
      active: true,
    }),

  /**
   * المنتجات المخفضة
   */
  discounted: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/discounted', {
      family_id: familyId,
      limit: 20,
      include: 'product,product.family,unit,tva,prices.priceLevel,quantityDiscounts',
      active: true,
    }),

  /**
   * تجميع النتائج حسب الفئة
   * يجلب أفضل النتائج من كل فئة
   */
  searchGroupedByFamily: (query: string, familiesLimit?: number) =>
    apiGet<Record<string, ProductVariant[]>>(
      '/product-variants/search/grouped',
      {
        search: query,
        families_limit: familiesLimit || 10,
        variants_per_family: 10,
        include: 'product,product.family,unit,tva,prices.priceLevel',
        active: true,
      },
    ),

  /**
   * الحصول على متغيرات منتج بتشابه عالي
   * يُستخدم للاقتراحات (recommendations)
   */
  similar: (productId: number, limit?: number) =>
    apiGet<ProductVariant[]>(`/products/${productId}/similar-variants`, {
      limit: limit || 5,
      include: 'product,product.family,unit,tva,prices.priceLevel',
      active: true,
    }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * جلب جميع الفئات
 * استخدام:
 * ```tsx
 * const { data: families } = useAllFamilies();
 * ```
 */
export function useAllFamilies() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.lookups.families(slug ?? ''),
    queryFn: () => productsEnhancedApi.getAllFamilies(),
    enabled: !!slug,
    staleTime: 30 * 60_000, // 30 دقيقة
  });
}

/**
 * بحث ذكي متقدم
 * استخدام:
 * ```tsx
 * const { data: results, isLoading } = useSmartSearch({
 *   query: searchQuery,
 *   family_id: selectedCategory,
 *   sort: 'popularity',
 * });
 * ```
 */
export function useSmartSearch(params: SmartSearchParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'smart-search', params],
    queryFn: () => productsEnhancedApi.smartSearch(params),
    enabled: !!slug && !!params.query.trim(),
    staleTime: 2 * 60_000, // 2 دقائق
  });
}

/**
 * بحث بالباركود
 */
export function useBarcodeLookup(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'barcode', barcode],
    queryFn: () => productsEnhancedApi.barcodeSearch(barcode!),
    enabled: !!slug && !!barcode,
    staleTime: 5 * 60_000,
  });
}

/**
 * المنتجات الشعبية
 */
export function useTrendingProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'trending', familyId],
    queryFn: () => productsEnhancedApi.trending(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

/**
 * المنتجات المخفضة
 */
export function useDiscountedProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'discounted', familyId],
    queryFn: () => productsEnhancedApi.discounted(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

/**
 * البحث مع التجميع حسب الفئة
 */
export function useGroupedSearch(query: string, familiesLimit?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'grouped-search', query, familiesLimit],
    queryFn: () => productsEnhancedApi.searchGroupedByFamily(query, familiesLimit),
    enabled: !!slug && !!query.trim(),
    staleTime: 2 * 60_000,
  });
}

/**
 * متغيرات مشابهة
 */
export function useSimilarVariants(productId: number | null, limit?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'similar', productId, limit],
    queryFn: () => productsEnhancedApi.similar(productId!, limit),
    enabled: !!slug && !!productId,
    staleTime: 10 * 60_000,
  });
}

export default productsEnhancedApi;
