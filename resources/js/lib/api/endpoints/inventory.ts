// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts — مُصلح
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
// ✅ FIX: أضفنا apiPut
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  StockMovement, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockMovementCreateInput {
  product_variant_id:     number;
  warehouse_id:           number;
  fiscal_year_id:         number;
  stock_movement_type_id: number;
  movement_date:          string;
  quantity:               number;
  unit_price:             number;
  notes?:                 string | null;
}

export interface StockMovementListParams extends ListParams {
  product_variant_id?:     number;
  warehouse_id?:           number;
  stock_movement_type_id?: number;
  fiscal_year_id?:         number;
  date_from?:              string;
  date_to?:                string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
  // ── Stock Movements ────────────────────────────────────────────────────────
  movements: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements', {
      ...params,
      include: 'productVariant.product,warehouse,movementType',
    }),

  incoming: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/incoming', params),

  outgoing: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/outgoing', params),

  createMovement: (data: StockMovementCreateInput) =>
    apiPost<StockMovement>('/stock-movements', data),

  deleteMovement: (id: number) =>
    apiDelete(`/stock-movements/${id}`),

  // ── Product Lots ───────────────────────────────────────────────────────────
  lots: (params?: ListParams) =>
    apiGet<PaginatedResponse<ProductLot>>('/product-lots', params),

  lotAvailable: () =>
    apiGet<ProductLot[]>('/product-lots/available'),

  lotExpiring: (days = 30) =>
    apiGet<ProductLot[]>('/product-lots/expiring', { days }),

  createLot: (data: Partial<ProductLot>) =>
    apiPost<ProductLot>('/product-lots', data),

  // ✅ FIX: apiPut بدل apiPost
  updateLot: (id: number, data: Partial<ProductLot>) =>
    apiPut<ProductLot>(`/product-lots/${id}`, data),

  deleteLot: (id: number) =>
    apiDelete(`/product-lots/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStockMovements(params?: StockMovementListParams) {
  const slug = useActiveSlug();
  return useQuery({
    // ✅ FIX: استخدام tenantKeys.inventory.movements الجديد
    queryKey:        tenantKeys.inventory.movements(slug ?? '', params),
    queryFn:         () => inventoryApi.movements(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProductLots(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.inventory.lots(slug ?? '', params),
    queryFn:         () => inventoryApi.lots(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpiringLots(days = 30) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'product-lots', 'expiring', days],
    queryFn:   () => inventoryApi.lotExpiring(days),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInventoryMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
    // إبطال المنتجات أيضاً — الحركات تغير current_stock
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    createMovement: useMutation({
      mutationFn: inventoryApi.createMovement,
      onSuccess:  invalidate,
    }),
    deleteMovement: useMutation({
      mutationFn: inventoryApi.deleteMovement,
      onSuccess:  invalidate,
    }),
    createLot: useMutation({
      mutationFn: inventoryApi.createLot,
      onSuccess:  invalidate,
    }),
    updateLot: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductLot> }) =>
        inventoryApi.updateLot(id, data),
      onSuccess: invalidate,
    }),
    deleteLot: useMutation({
      mutationFn: inventoryApi.deleteLot,
      onSuccess:  invalidate,
    }),
  };
}
