import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { ProductVariant, Family, PaginatedResponse } from '../core/types';

export interface FamilyWithStats extends Family {
  _count?: { products: number; active_products?: number };
}

export interface SmartSearchParams {
  query: string;
  family_id?: number;
  price_from?: number;
  price_to?: number;
  in_stock?: boolean;
  sort?: 'popularity' | 'rating' | 'price' | 'newest' | 'name';
  per_page?: number;
}

export const productsEnhancedApi = {
  getAllFamilies: () =>
    apiGet<FamilyWithStats[]>('/families', {
      active: true, per_page: 1000, sort: 'display_order,name',
    }),

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

  barcodeSearch: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants/barcode-search', {
      barcode, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  trending: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/trending', {
      family_id: familyId, limit: 20, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  discounted: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/discounted', {
      family_id: familyId, limit: 20, include: 'product,product.family,unit,tva,prices.priceLevel,quantityDiscounts', active: true,
    }),

  searchGroupedByFamily: (query: string, familiesLimit?: number) =>
    apiGet<Record<string, ProductVariant[]>>('/product-variants/search/grouped', {
      search: query, families_limit: familiesLimit || 10, variants_per_family: 10,
      include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  similar: (productId: number, limit?: number) =>
    apiGet<ProductVariant[]>(`/products/${productId}/similar-variants`, {
      limit: limit || 5, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),
} as const;

export function useAllFamilies() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.lookups.families(slug ?? ''),
    queryFn: () => productsEnhancedApi.getAllFamilies(),
    enabled: !!slug,
    staleTime: 30 * 60_000,
  });
}

export function useSmartSearch(params: SmartSearchParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'smart-search', params],
    queryFn: () => productsEnhancedApi.smartSearch(params),
    enabled: !!slug && !!params.query.trim(),
    staleTime: 2 * 60_000,
  });
}

export function useBarcodeLookup(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'barcode', barcode],
    queryFn: () => productsEnhancedApi.barcodeSearch(barcode!),
    enabled: !!slug && !!barcode,
    staleTime: 5 * 60_000,
  });
}

export function useTrendingProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'trending', familyId],
    queryFn: () => productsEnhancedApi.trending(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useDiscountedProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'discounted', familyId],
    queryFn: () => productsEnhancedApi.discounted(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useGroupedSearch(query: string, familiesLimit?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'grouped-search', query, familiesLimit],
    queryFn: () => productsEnhancedApi.searchGroupedByFamily(query, familiesLimit),
    enabled: !!slug && !!query.trim(),
    staleTime: 2 * 60_000,
  });
}

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
