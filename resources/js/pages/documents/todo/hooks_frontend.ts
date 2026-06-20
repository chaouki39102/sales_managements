// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useComputeLine.ts
//
// يستدعي POST /documents/compute-line من الباكاند.
// يُستخدَم داخل updateLine في useDocumentForm.
//
// السلوك:
//   - debounce 350ms على تغييرات الكمية والسعر
//   - إلغاء الطلبات القديمة (AbortController)
//   - تحديث السطر تلقائياً عند وصول النتيجة
//   - تجميع التحذيرات وعرضها
// ════════════════════════════════════════════════════════════════════════════

import {
  useCallback, useRef, useEffect, useState,
} from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiPost } from '@/lib/api/core/client';
import type { LineItem } from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComputeLineInput {
  product_id:     number;
  quantity:       number;         // عدد العبوات (displayQty)
  packaging_id?:  number | null;
  price_level_id?: number | null;
  warehouse_id?:  number | null;
  party_id?:      number | null;
  is_purchase?:   boolean;
  document_date?: string;
}

export interface ComputeLineWarning {
  type:    string;
  level:   'info' | 'warning' | 'error';
  message: string;
}

export interface ComputeLineResult {
  unit_price_ht:             number;
  price_per_pack:            number;
  pack_qty:                  number;
  packaging_id?:             number | null;
  packaging_label?:          string | null;
  discount_percentage:       number;
  discount_amount_per_unit:  number;
  discount_amount_per_pack:  number;
  is_quantity_blocked:       boolean;
  quantity_discount_tier?:   { min_qty: number; max_qty?: number | null; tier_order: number } | null;
  tva_rate:                  number;
  is_tva_exempt:             boolean;
  base_qty:                  number;
  total_ht:                  number;
  total_tva:                 number;
  total_ttc:                 number;
  stock_available:           number | null;
  lot_suggestions:           Array<{
    id:                  number;
    lot_number:          string;
    remaining_quantity:  number;
    expiration_date?:    string | null;
    legal_selling_price?: number | null;
    is_expiring_soon:    boolean;
    is_expired:          boolean;
  }>;
  cost_price:                number;
  margin_amount:             number;
  margin_percentage:         number;
  effective_price_level_id?: number | null;
  party_credit_info?:        {
    credit_limit:     number;
    used_credit:      number;
    available_credit: number;
    will_exceed:      boolean;
    exceed_by:        number;
    credit_days:      number;
  } | null;
  warnings: ComputeLineWarning[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseComputeLineOptions {
  enabled:     boolean;
  onSuccess?:  (result: ComputeLineResult, lineIdx: number) => void;
  onWarnings?: (warnings: ComputeLineWarning[], lineIdx: number) => void;
}

export function useComputeLine({ enabled, onSuccess, onWarnings }: UseComputeLineOptions) {
  const slug          = useActiveSlug();
  const abortRefs     = useRef<Map<number, AbortController>>(new Map());
  const debounceRefs  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  // cleanup
  useEffect(() => () => {
    debounceRefs.current.forEach(clearTimeout);
    abortRefs.current.forEach(ctrl => ctrl.abort());
  }, []);

  const compute = useCallback((
    lineIdx:  number,
    input:    ComputeLineInput,
    delay:    number = 350,
  ) => {
    if (!enabled || !slug || !input.product_id) return;

    // إلغاء debounce سابق
    const prevDebounce = debounceRefs.current.get(lineIdx);
    if (prevDebounce) clearTimeout(prevDebounce);

    const timer = setTimeout(async () => {
      // إلغاء طلب سابق
      abortRefs.current.get(lineIdx)?.abort();
      const ctrl = new AbortController();
      abortRefs.current.set(lineIdx, ctrl);

      setLoading(prev => new Set([...prev, lineIdx]));

      try {
        const result = await apiPost<ComputeLineResult>(
          '/documents/compute-line',
          input,
          { signal: ctrl.signal },
        );

        onSuccess?.(result, lineIdx);

        const activeWarnings = result.warnings.filter(w => w.level !== 'info');
        if (activeWarnings.length > 0) {
          onWarnings?.(activeWarnings, lineIdx);
        }

      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn(`compute-line error (idx=${lineIdx}):`, err);
      } finally {
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(lineIdx);
          return next;
        });
        abortRefs.current.delete(lineIdx);
      }
    }, delay);

    debounceRefs.current.set(lineIdx, timer);
  }, [enabled, slug, onSuccess, onWarnings]);

  /** استدعاء فوري بدون debounce (عند اختيار منتج جديد) */
  const computeImmediate = useCallback((lineIdx: number, input: ComputeLineInput) => {
    compute(lineIdx, input, 0);
  }, [compute]);

  return { compute, computeImmediate, loading };
}


// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useCreditCheck.ts
//
// يجلب حالة الائتمان للمتعامل.
// يُستدعى عند اختيار الزبون وعند تغيير إجمالي المستند.
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { toNum } from '../utils/document.utils';

export interface CreditCheckResult {
  party_id:              number;
  party_name:            string;
  credit_limit:          number;
  credit_days:           number;
  used_credit:           number;
  available_credit:      number | null;
  new_amount:            number;
  total_after:           number;
  will_exceed:           boolean;
  exceed_by:             number;
  suggested_due_date:    string | null;
  overdue_invoices:      { count: number; total_amount: number };
  is_tva_exempt:         boolean;
  is_final_consumer:     boolean;
  default_price_level_id: number | null;
  alerts:                Array<{ type: string; level: string; message: string }>;
  can_proceed:           boolean;
}

export function useCreditCheck(options: {
  partyId:    number | null;
  amount:     number;
  date:       string;
  isPurchase: boolean;
  enabled:    boolean;
}) {
  const slug = useActiveSlug();

  return useQuery<CreditCheckResult | null>({
    queryKey: [slug, 'credit-check', options.partyId, Math.round(options.amount), options.date],
    queryFn: async () => {
      if (!options.partyId) return null;
      return apiGet<CreditCheckResult>(
        `/parties/${options.partyId}/credit-check`,
        { amount: options.amount, date: options.date },
      );
    },
    enabled: !!slug && !!options.partyId && !options.isPurchase && options.enabled,
    staleTime: 30_000,
    // إعادة جلب عند تغيير المبلغ أو المتعامل
    gcTime: 10_000,
  });
}


// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentChain.ts
//
// يجلب سلسلة المستندات المرتبطة (آباء + أبناء).
// يُعرَض في المودال عند التعديل فقط.
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';

export interface ChainNode {
  id:               number;
  document_number:  string;
  document_type:    string;
  type_name:        string;
  status:           string;
  status_label:     string;
  document_date:    string;
  net_to_pay:       number;
  is_cancellation:  boolean;
  children?:        ChainNode[];
}

export interface DocumentChain {
  ancestors:   ChainNode[];
  current:     ChainNode;
  descendants: ChainNode[];
}

export function useDocumentChain(documentId: number | null | undefined) {
  const slug = useActiveSlug();

  return useQuery<DocumentChain | null>({
    queryKey: [slug, 'document-chain', documentId],
    queryFn: () =>
      documentId
        ? apiGet<DocumentChain>(`/documents/${documentId}/chain`)
        : null,
    enabled: !!slug && !!documentId,
    staleTime: 60_000,
  });
}

// ─── Conversion mutation ──────────────────────────────────────────────────────

export interface ConversionPayload {
  documentId:      number;
  targetTypeCode:  string;
  includeLineIds?: number[];
}

export function useConvertDocument() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, targetTypeCode, includeLineIds }: ConversionPayload) =>
      apiPost(`/documents/${documentId}/convert`, {
        target_type_code: targetTypeCode,
        include_line_ids: includeLineIds,
      }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}

// ─── Return mutation ──────────────────────────────────────────────────────────

export interface ReturnPayload {
  documentId: number;
  reason:     string;
  lines:      Array<{ line_id: number; quantity: number }>;
}

export function useCreateReturn() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason, lines }: ReturnPayload) =>
      apiPost(`/documents/${documentId}/return`, { reason, lines }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}
