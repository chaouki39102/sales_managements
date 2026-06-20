import {
  useCallback, useRef, useEffect, useState,
} from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiPost } from '@/lib/api/core/client';
import type { LineItem } from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComputeLineInput {
  product_id:                    number;
  quantity:                      number;
  packaging_id?:                 number | null;
  price_level_id?:               number | null;
  warehouse_id?:                 number | null;
  party_id?:                     number | null;
  is_purchase?:                  boolean;
  document_date?:                string;
  // الخصم اليدوي — يُمرَّر للباكاند ليُدرجه في حساب الإجماليات
  // الباكاند يُطبّقه فقط إذا لم يوجد خصم كميات تلقائي
  manual_discount_mode?:         'percent' | 'fixed' | null;
  manual_discount_percentage?:   number;
  manual_discount_amount_fixed?: number;  // خصم العبوة الواحدة
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

    const prevDebounce = debounceRefs.current.get(lineIdx);
    if (prevDebounce) clearTimeout(prevDebounce);

    const timer = setTimeout(async () => {
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
