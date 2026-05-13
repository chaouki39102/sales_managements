// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { PaginatedResponse, ListParams, BaseModel } from '../core/types';

export interface StockMovement extends BaseModel {
  product_id:  number;
  warehouse_id:number;
  quantity:    number;
  direction:   'in' | 'out';
  type_id:     number;
  reference?:  string | null;
  date:        string;
  company_id:  number;
  fiscal_year_id: number;
}

export const inventoryApi = {
  movements: (params?: ListParams) => apiGet<PaginatedResponse<StockMovement>>('/stock-movements', params),
  create:    (data: Partial<StockMovement>) => apiPost<StockMovement>('/stock-movements', data),
  delete:    (id: number) => apiDelete(`/stock-movements/${id}`),
} as const;

export function useStockMovements(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.inventory.movements(slug ?? '', params),
    queryFn:         () => inventoryApi.movements(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) }); };

  return {
    create: useMutation({ mutationFn: inventoryApi.create, onSuccess: inv }),
    remove: useMutation({ mutationFn: inventoryApi.delete, onSuccess: inv }),
  };
}
