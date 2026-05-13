// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Product, PaginatedResponse, ListParams } from '../core/types';

export const productsApi = {
  list:   (params?: ListParams) => apiGet<PaginatedResponse<Product>>('/products', params),
  show:   (id: number)          => apiGet<Product>(`/products/${id}`),
  active: ()                    => apiGet<Product[]>('/products/active'),
  create: (data: Partial<Product>)         => apiPost<Product>('/products', data),
  update: (id: number, data: Partial<Product>) => apiPut<Product>(`/products/${id}`, data),
  delete: (id: number)          => apiDelete(`/products/${id}`),
  uploadImage: (id: number, fd: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Product>(`/products/${id}/image`, fd, onProgress),
} as const;

export function useProducts(params?: ListParams) {
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
    queryKey: tenantKeys.products.detail(slug ?? '', id!),
    queryFn:  () => productsApi.show(id!),
    enabled:  !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const invalidate = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) }); };

  return {
    create: useMutation({ mutationFn: productsApi.create,                                                    onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => productsApi.update(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: productsApi.delete,                                                    onSuccess: invalidate }),
    uploadImage: useMutation({
      mutationFn: ({ id, formData, onProgress }: { id: number; formData: FormData; onProgress?: (p: number) => void }) =>
        productsApi.uploadImage(id, formData, onProgress),
      onSuccess: (updated: Product) => {
        if (slug) {
          qc.setQueryData(tenantKeys.products.detail(slug, updated.id), updated);
          qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
        }
      },
    }),
  };
}
