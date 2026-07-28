import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { useActiveSlug } from '../../store/appStore';
import type { Barcode } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarcodeCreateInput {
  product_id:  number;
  barcode:     string;
  type?:       string;
  is_primary?: boolean;
  unit?:       string | null;
  variant_id?: number | null;
}

export type BarcodeUpdateInput = Partial<Omit<BarcodeCreateInput, 'product_id'>>;

// ─── API ──────────────────────────────────────────────────────────────────────

export const barcodesApi = {
  byProduct: (productId: number) =>
    apiGet<Barcode[]>(`/products/${productId}/barcodes`),

  create: (data: BarcodeCreateInput) =>
    apiPost<Barcode>('/barcodes', data),

  update: (id: number, data: BarcodeUpdateInput) =>
    apiPut<Barcode>(`/barcodes/${id}`, data),

  remove: (id: number) =>
    apiDelete(`/barcodes/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProductBarcodes(productId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'barcodes'],
    queryFn:   () => barcodesApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 60_000,
  });
}

export function useBarcodeMutations(productId: number | null) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug && productId) {
      qc.invalidateQueries({ queryKey: [slug, 'products', productId, 'barcodes'] });
      qc.invalidateQueries({ queryKey: [slug, 'products'] });
    }
  };

  return {
    create: useMutation({
      mutationFn: barcodesApi.create,
      onSuccess:  invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: BarcodeUpdateInput }) =>
        barcodesApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: barcodesApi.remove,
      onSuccess:  invalidate,
    }),
  };
}
