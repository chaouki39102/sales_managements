// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/portalOrders.ts — طلبات بوابة الزبائن (الواجهة الإدارية)
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../core/client';
import { useActiveSlug } from '../../store/appStore';
import type { PortalOrderStatus } from '../portal/portal';

export interface PortalAdminOrderItem {
  line_id:       number;
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  unit_price_ht: number;
  tva_rate:      number;
  quantity:      number;
  packaging_id:  number | null;
  pack_qty:      number;
  discount_percentage:  number;
  total_discount_amount: number;
  total_ht:      number;
  total_tva:     number;
  total_ttc:     number;
  // النسبة الاسمية للمنتج (TVA) مقابل النسبة المخزّنة على السطر (قد تختلف
  // لزبون معفى جبائياً — نعرضها مع شارة «معفى» ولا نعدّل بها الحسابات).
  tva_rate_live: number;
}

export interface PortalAdminStockInfo {
  line_id:        number;
  product_id:     number;
  warehouse_id:   number | null;
  available:      number | null;
  available_all:  number | null;
  required:       number;
  sufficient:     boolean | null;
  sufficient_all: boolean | null;
}

export interface PortalAdminOrder {
  id:           number;
  reference:    string;
  status:       PortalOrderStatus;
  status_label: string;
  allowed_next: PortalOrderStatus[];
  // التحويل إلى فاتورة مسموح مرة واحدة فقط — أول تحويل ناجح يثبّت
  // sale_document_id ويجعل is_converted صحيحاً (الزر يُخفى في الواجهة).
  is_converted: boolean;
  sale_document_id: number | null;
  notes:        string | null;
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  total_discount: number;
  items_count:  number;
  requested_at: string | null;
  created_at:   string | null;
  party:        { id: number; name: string; code: string | null; phone: string | null; is_tva_exempt: boolean } | null;
  lines?:       PortalAdminOrderItem[];
  stock?:       PortalAdminStockInfo[];
  document?:    {
    id:              number;
    document_number: string;
    document_date:   string | null;
    document_type:   string | null;
    type_name:       string | null;
    net_to_pay:      number;
    warehouse_id:    number | null;
  } | null;
  histories?:   {
    id:             number;
    status:         string;
    status_label:   string;
    changed_by:     string;
    changed_by_name: string | null;
    note:           string | null;
    created_at:     string | null;
  }[];
}

export interface PortalAdminOrderLineInput {
  line_id?:      number;
  product_id?:   number;
  quantity:      number;
  packaging_id?: number;
  // المسؤول يملك تعديل السعر والخصم
  unit_price_ht?: number;
  discount_percentage?: number;
}

export interface PortalAdminOrderFilters {
  page?: number;
  per_page?: number;
  status?: PortalOrderStatus | '';
  search?: string;
  from_date?: string;
  to_date?: string;
}

/** دفعة اختيارية تُسجَّل مع تحويل الطلب إلى فاتورة (FV/POS). */
export interface PortalConvertPayment {
  payment_mode_id:   number;
  amount:            number;
  payment_date?:     string;
  reference?:        string;
  treasury_account_id?: number;
  notes?:            string;
}

export interface PortalConvertTarget {
  target: 'FV' | 'POS';
  payment?: PortalConvertPayment;
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
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      },
    ),
  summary: () =>
    apiGet<PortalOrdersSummary>('/portal-orders/summary'),
  detail: (id: number) =>
    apiGet<PortalAdminOrder>(`/portal-orders/${id}`),
  updateStatus: (id: number, data: { status: PortalOrderStatus; notes?: string }) =>
    apiPatch<PortalAdminOrder>(`/portal-orders/${id}`, data),
  updateLines: (id: number, lines: PortalAdminOrderLineInput[]) =>
    apiPatch<PortalAdminOrder>(`/portal-orders/${id}/lines`, { lines }),
  convert: (id: number, data: PortalConvertTarget = { target: 'FV' }) =>
    apiPost<{ order: PortalAdminOrder; sale: PortalConvertSale }>(
      `/portal-orders/${id}/convert`,
      data,
    ),
} as const;

export interface PortalConvertSale {
  id: number;
  document_number: string;
  document_type: string | null;
  net_to_pay: number;
  total_ttc: number;
  paid_amount: number;
  remaining_amount: number;
  document_date: string | null;
}

export const PORTAL_ORDER_STATUSES: { value: PortalOrderStatus; label: string; cls: string }[] = [
  { value: 'preparing', label: 'قيد الاعداد',  cls: 'badge--y' },
  { value: 'confirmed', label: 'مؤكد',         cls: 'badge--b' },
  { value: 'processed', label: 'تم المعالجة',  cls: 'badge--purple' },
  { value: 'shipped',   label: 'الشحن',        cls: 'badge--z' },
  { value: 'delivered', label: 'تم التسليم',   cls: 'badge--g' },
  { value: 'returned',  label: 'مرتجع',        cls: 'badge--r' },
  { value: 'cancelled', label: 'ملغي',         cls: 'badge--gray' },
];

// المسار الرئيسي لخط الأنابيب (الطريقة الاحترافية) — ترتيب الخطوات في العرض.
export const PORTAL_ORDER_PIPELINE: { value: PortalOrderStatus; label: string; icon: string }[] = [
  { value: 'preparing', label: 'قيد الاعداد',  icon: 'ti-pencil' },
  { value: 'confirmed', label: 'مؤكد',         icon: 'ti-circle-check' },
  { value: 'processed', label: 'تم المعالجة',  icon: 'ti-settings' },
  { value: 'shipped',   label: 'الشحن',        icon: 'ti-truck' },
  { value: 'delivered', label: 'تم التسليم',   icon: 'ti-package-import' },
];

export interface PortalOrdersSummary {
  total:     number;
  preparing: number;
  confirmed: number;
  processed: number;
  shipped:   number;
  delivered: number;
  returned:  number;
  cancelled: number;
  pending?:  number;
}

export function usePortalOrdersSummary() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: ['portal-orders', slug, 'summary'],
    queryFn: () => portalOrdersApi.summary(),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

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

export function usePortalOrderLinesUpdate() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lines }: { id: number; lines: PortalAdminOrderLineInput[] }) =>
      portalOrdersApi.updateLines(id, lines),
    onSuccess: (data, vars) => {
      if (!slug) return;
      qc.invalidateQueries({ queryKey: ['portal-orders', slug] });
      qc.setQueryData(['portal-orders', slug, 'detail', vars.id], data);
    },
  });
}

export interface PortalOrderConvertResult {
  order: PortalAdminOrder;
  sale: PortalConvertSale;
}

export function usePortalOrderConvert() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PortalConvertTarget }) =>
      portalOrdersApi.convert(id, data),
    onSuccess: () => {
      if (!slug) return;
      qc.invalidateQueries({ queryKey: ['portal-orders', slug] });
    },
  });
}
