// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/portalOrders.ts — طلبات بوابة الزبائن (الواجهة الإدارية)
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../core/client';
import { useActiveSlug } from '../../store/appStore';
import type { PortalOrderStatus } from '../portal/portal';

export interface PortalAdminOrderItem {
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  unit_price_ht: number;
  tva_rate:      number;
  quantity:      number;
  total_ht:      number;
  total_tva:     number;
  total_ttc:     number;
}

export interface PortalAdminOrder {
  id:           number;
  reference:    string;
  status:       PortalOrderStatus;
  status_label: string;
  notes:        string | null;
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  items_count:  number;
  requested_at: string | null;
  created_at:   string | null;
  party:        { id: number; name: string; code: string | null } | null;
  items?:       PortalAdminOrderItem[];
}

export interface PortalAdminOrderFilters {
  page?: number;
  per_page?: number;
  status?: PortalOrderStatus | '';
  search?: string;
}

export interface PortalAdminOrderListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const portalOrdersApi = {
  list: (filters: PortalAdminOrderFilters = {}) =>
    apiGet<{ data: PortalAdminOrder[]; meta: PortalAdminOrderListMeta }>(
      '/portal-orders',
      {
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 15,
        status: filters.status || undefined,
        search: filters.search || undefined,
      },
    ),
  detail: (id: number) =>
    apiGet<PortalAdminOrder>(`/portal-orders/${id}`),
  updateStatus: (id: number, data: { status: PortalOrderStatus; notes?: string }) =>
    apiPatch<PortalAdminOrder>(`/portal-orders/${id}`, data),
  convert: (id: number, target = 'FV') =>
    apiPost<{ order: PortalAdminOrder; sale: { id: number; document_number: string; document_type: string | null; net_to_pay: number; total_ttc: number; document_date: string | null } }>(
      `/portal-orders/${id}/convert`,
      { target },
    ),
} as const;

export const PORTAL_ORDER_STATUSES: { value: PortalOrderStatus; label: string; cls: string }[] = [
  { value: 'pending',    label: 'قيد الانتظار', cls: 'badge--y' },
  { value: 'processing', label: 'قيد التجهيز',  cls: 'badge--b' },
  { value: 'completed',  label: 'مكتمل',        cls: 'badge--g' },
  { value: 'cancelled',  label: 'ملغي',         cls: 'badge--r' },
];

export function usePortalOrders(filters: PortalAdminOrderFilters) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: ['portal-orders', slug, filters],
    queryFn: () => portalOrdersApi.list(filters),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

export function usePortalOrderDetail(id: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: ['portal-orders', slug, 'detail', id],
    queryFn: () => portalOrdersApi.detail(id!),
    enabled: !!slug && !!id,
  });
}

export function usePortalOrderStatusUpdate() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: PortalOrderStatus }) =>
      portalOrdersApi.updateStatus(id, { status }),
    onSuccess: () => {
      if (!slug) return;
      qc.invalidateQueries({ queryKey: ['portal-orders', slug] });
    },
  });
}

export interface PortalOrderConvertResult {
  order: PortalAdminOrder;
  sale: {
    id: number;
    document_number: string;
    document_type: string | null;
    net_to_pay: number;
    total_ttc: number;
    document_date: string | null;
  };
}

export function usePortalOrderConvert() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => portalOrdersApi.convert(id, 'FV'),
    onSuccess: () => {
      if (!slug) return;
      qc.invalidateQueries({ queryKey: ['portal-orders', slug] });
    },
  });
}
