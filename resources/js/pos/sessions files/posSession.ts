// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/posSession.ts
//
// API + hooks لنظام جلسات POS
// ════════════════════════════════════════════════════════════════════════════

import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/client';
import { useActiveSlug }   from '../../store/appStore';
import type { CartItem }   from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosSessionPaymentLine {
  payment_mode_id: number;
  payment_mode?:   { id: number; name: string; code: string };
  amount:          number;
  count:           number;
}

export interface PosSessionProduct {
  product_id:    number;
  product_name:  string;
  quantity_sold: number;
  total_ht:      number;
  total_ttc:     number;
}

export interface PosSession {
  id:                     number;
  status:                 'open' | 'closed' | 'suspended';
  opened_at:              string;
  closed_at:              string | null;
  duration:               string;
  user:                   { id: number; name: string };
  warehouse:              { id: number; name: string };
  opening_cash:           number;
  opening_note:           string | null;
  invoices_count:         number;
  returns_count:          number;
  gross_sales:            number;
  returns_total:          number;
  net_sales:              number;
  total_tva:              number;
  total_fiscal_stamp:     number;
  total_discount:         number;
  highest_invoice:        number;
  avg_invoice:            number;
  cash_collected:         number;
  cib_collected:          number;
  ccp_collected:          number;
  bank_collected:         number;
  credit_total:           number;
  closing_cash_counted:   number | null;
  closing_cash_expected:  number | null;
  cash_difference:        number | null;
  closing_note:           string | null;
  payments:               PosSessionPaymentLine[];
  top_products:           PosSessionProduct[];
}

export interface OpenSessionInput {
  warehouse_id:    number;
  fiscal_year_id:  number;
  opening_cash:    number;
  opening_note?:   string;
}

export interface IncrementSessionInput {
  invoice_total:      number;
  total_ht:           number;
  total_tva:          number;
  total_fiscal_stamp: number;
  total_discount:     number;
  is_return?:         boolean;
  payments?: Array<{ payment_mode_id: number; amount: number }>;
  items?:    Array<{
    product_id:   number;
    product_name: string;
    quantity:     number;
    total_ht:     number;
    total_ttc:    number;
  }>;
}

export interface CloseSessionInput {
  closing_cash_counted: number;
  closing_note?:        string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const sessionKeys = {
  all:     (slug: string) => [slug, 'pos-sessions'] as const,
  current: (slug: string) => [slug, 'pos-sessions', 'current'] as const,
  list:    (slug: string, p?: object) => [slug, 'pos-sessions', 'list', p] as const,
  detail:  (slug: string, id: number) => [slug, 'pos-sessions', id] as const,
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const posSessionApi = {
  current: ()                        => apiGet<PosSession | null>('/pos-sessions/current'),
  open:    (data: OpenSessionInput)  => apiPost<PosSession>('/pos-sessions', data),
  increment: (id: number, data: IncrementSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/increment`, data),
  close:   (id: number, data: CloseSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/close`, data),
  list:    (params?: object) =>
    apiGet<{ data: PosSession[]; meta: any }>('/pos-sessions', params as any),
  show:    (id: number) => apiGet<PosSession>(`/pos-sessions/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** الجلسة المفتوحة للمستخدم الحالي — يُستدعى عند تحميل POSPage */
export function useCurrentPosSession() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  sessionKeys.current(slug ?? ''),
    queryFn:   posSessionApi.current,
    enabled:   !!slug,
    staleTime: 0,  // دائماً نتحقق من الخادم
    retry:     false,
  });
}

/** قائمة الجلسات (للمدير) */
export function usePosSessionList(params?: object) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        sessionKeys.list(slug ?? '', params),
    queryFn:         () => posSessionApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** تفاصيل جلسة واحدة */
export function usePosSession(id: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  sessionKeys.detail(slug ?? '', id!),
    queryFn:   () => posSessionApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 60_000,
  });
}

/** فتح جلسة جديدة */
export function useOpenSession() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: posSessionApi.open,
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), session);
        qc.invalidateQueries({ queryKey: sessionKeys.all(slug) });
      }
    },
  });
}

/** تسجيل بيع في الجلسة */
export function useIncrementSession(sessionId: number | null) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: (data: IncrementSessionInput) =>
      posSessionApi.increment(sessionId!, data),
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), session);
        qc.setQueryData(sessionKeys.detail(slug, session.id), session);
      }
    },
    // لا نعطّل البيع إذا فشل تسجيل الجلسة
    onError: (err) => console.warn('[POS Session increment failed]', err),
  });
}

/** إغلاق الجلسة */
export function useCloseSession(sessionId: number | null) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: (data: CloseSessionInput) =>
      posSessionApi.close(sessionId!, data),
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), null);
        qc.setQueryData(sessionKeys.detail(slug, session.id), session);
        qc.invalidateQueries({ queryKey: sessionKeys.all(slug) });
      }
    },
  });
}

// ─── Helper: بناء IncrementSessionInput من بيانات الفاتورة ───────────────────

export function buildIncrementInput(params: {
  items:          CartItem[];
  totalHt:        number;
  totalTva:       number;
  totalFiscalStamp: number;
  totalDiscount:  number;
  grandTotal:     number;
  isReturn?:      boolean;
  payments?:      Array<{ payment_mode_id: number; amount: number }>;
}): IncrementSessionInput {
  return {
    invoice_total:      params.grandTotal,
    total_ht:           params.totalHt,
    total_tva:          params.totalTva,
    total_fiscal_stamp: params.totalFiscalStamp,
    total_discount:     params.totalDiscount,
    is_return:          params.isReturn ?? false,
    payments:           params.payments ?? [],
    items: params.items.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      quantity:     i.quantity,
      total_ht:     i.total_ht,
      total_ttc:    i.total_ttc,
    })),
  };
}
