import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../core/client';
import { useActiveSlug }   from '../../store/appStore';
import type { CartItem }   from '@/types';

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
  last_seen_at:           string | null;
  last_active_at:         string | null;
  is_online:              boolean;
  work_minutes:           number;
  idle_minutes:           number;
  duration:               string;
  user:                   { id: number; name: string };
  warehouse:              { id: number; name: string };
  opening_cash:           number;
  opening_note:           string | null;
  device_name:            string | null;
  device_ip:              string | null;
  device_user_agent:      string | null;
  device_browser_info:    { platform: string; language: string; screen: string; cores: number } | null;
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
  warehouse_id:       number;
  fiscal_year_id:     number;
  opening_cash:       number;
  opening_note?:      string;
  device_name?:       string;
  device_browser_info?: string;
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

export interface HeartbeatInput {
  active: boolean;
}

const sessionKeys = {
  all:     (slug: string) => [slug, 'pos-sessions'] as const,
  current: (slug: string) => [slug, 'pos-sessions', 'current'] as const,
  list:    (slug: string, p?: object) => [slug, 'pos-sessions', 'list', p] as const,
  detail:  (slug: string, id: number) => [slug, 'pos-sessions', id] as const,
};

export const posSessionApi = {
  current:    (deviceName?: string)     => apiGet<PosSession | null>(`/pos-sessions/current${deviceName ? `?device_name=${encodeURIComponent(deviceName)}` : ''}`),
  deviceName: ()                        => apiGet<string | null>('/pos-sessions/device-name'),
  open:    (data: OpenSessionInput)  => apiPost<PosSession>('/pos-sessions', data),
  increment: (id: number, data: IncrementSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/increment`, data),
  heartbeat: (id: number, data: HeartbeatInput) =>
    apiPost<{ session_id: number; is_online: boolean; last_seen_at: string; last_active_at: string }>(`/pos-sessions/${id}/heartbeat`, data),
  close:   (id: number, data: CloseSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/close`, data),
  list:    (params?: object) =>
    apiGet<{ data: PosSession[]; meta: any }>('/pos-sessions', params as any),
  show:    (id: number) => apiGet<PosSession>(`/pos-sessions/${id}`),
} as const;

function getDeviceNameFromStorage(): string | undefined {
  try { return localStorage.getItem('pos-device-name') ?? undefined; } catch { return undefined; }
}

export function useCurrentPosSession() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:            sessionKeys.current(slug ?? ''),
    queryFn:             () => posSessionApi.current(getDeviceNameFromStorage()),
    enabled:             !!slug,
    staleTime:           0,
    refetchOnWindowFocus: true,
    refetchInterval:     15_000,
    retry:               false,
  });
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const ACTIVE_WINDOW_MS      = 30_000;

/**
 * نبضة قلب لجلسة POS مفتوحة: تُرسَل كل 30 ثانية، وتَحمل `active = true`
 * إذا كان هناك نشاط مستخدم (نقرة/لوحة مفاتيح/لمس) خلال آخر 30 ثانية.
 * حضور الجلسة (متصلة الآن) وخمولها يُحسبان من هذه النبضات على الخادم.
 * الفشل (أوفلاين/شبكة) يُتجاهل صمتاً — نبضة القلب عملية خلفية غير حرجة.
 */
export function useSessionHeartbeat(sessionId: number | null | undefined) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const idRef = useRef<number | null | undefined>(sessionId);
  idRef.current = sessionId;

  useEffect(() => {
    const lastActivity = { at: Date.now() };
    const mark = () => { lastActivity.at = Date.now(); };
    window.addEventListener('pointerdown', mark);
    window.addEventListener('keydown', mark);
    window.addEventListener('touchstart', mark);

    let cancelled = false;

    const send = async () => {
      const id = idRef.current;
      if (!id || !slug || !navigator.onLine) return;
      try {
        const res = await posSessionApi.heartbeat(id, {
          active: Date.now() - lastActivity.at < ACTIVE_WINDOW_MS,
        });
        if (cancelled) return;
        const cur = qc.getQueryData<PosSession>(sessionKeys.current(slug));
        if (cur && cur.id === id && !cur.is_online) {
          qc.setQueryData(sessionKeys.current(slug), {
            ...cur,
            is_online:    true,
            last_seen_at: res.last_seen_at,
          });
        }
      } catch {
        /* نبضة قلب فاشلة = غير مهمة */
      }
    };

    void send();
    const timer = window.setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
      window.removeEventListener('touchstart', mark);
    };
  }, [slug, qc]);
}

/** قائمة الجلسات المباشرة لصفحة مراقبة الجلسات — إعادة جلب كل 15 ثانية بلا stale. */
export function useSessionMonitorList(params?: object) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:             sessionKeys.list(slug ?? '', { monitor: true, ...params }),
    queryFn:              () => posSessionApi.list({ per_page: 200, ...params }),
    enabled:              !!slug,
    staleTime:            0,
    refetchInterval:      15_000,
    refetchOnWindowFocus: true,
    placeholderData:      keepPreviousData,
  });
}

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

export function usePosSession(id: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  sessionKeys.detail(slug ?? '', id!),
    queryFn:   () => posSessionApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 60_000,
  });
}

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
    onError: (err) => console.warn('[POS Session increment failed]', err),
  });
}

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
