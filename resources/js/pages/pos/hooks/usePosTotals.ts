// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosTotals.ts
//
// Derived cart totals for POSPage: invoice discount, fiscal stamp, final TTC,
// remaining to pay (editing) and weighted average margin.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { calcFiscalStamp, calcWeightedAverageMargin } from '@/pos/utils/calculations';
import type { ProductVariant } from '@/types';
import type { PosState } from './posPageTypes';

export function usePosTotals(params: {
  pos: PosState;
  systemFiscalStampEnabled: boolean;
  allVariants: ProductVariant[];
}) {
  const { pos, systemFiscalStampEnabled, allVariants } = params;

  // ── Invoice discount ───────────────────────────────────────────────────────
  // ✅ pos.totals (من calcTotals) تُطبِّق الخصم بالفعل ومرة واحدة فقط
  const invoiceDiscountAmount = pos.totals.invoice_discount_amount ?? 0;

  const fiscalStampAmount = systemFiscalStampEnabled ? calcFiscalStamp(pos.totals.total_ttc) : 0;
  const adjustedTotalTtcFinal = pos.totals.total_ttc + fiscalStampAmount;

  const existingPaymentsSum = useMemo(
    () => pos.payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [pos.payments],
  );
  const remainingToPay = Math.max(0, adjustedTotalTtcFinal - existingPaymentsSum);

  const avgMargin = useMemo(() => {
    if (!pos.items.length) return 0;
    const costMap = new Map(allVariants.map(v => [v.id, v.average_cost_price ?? 0]));
    const marginItems = pos.items.flatMap(i => {
      const cost = costMap.get(i.variant_id) ?? 0;
      if (cost <= 0) return [];
      return [{
        sellingHt: i.unit_price_ht * i.quantity,
        costHt: cost * i.quantity,
      }];
    });
    return calcWeightedAverageMargin(marginItems);
  }, [pos.items, allVariants]);

  return { invoiceDiscountAmount, adjustedTotalTtcFinal, remainingToPay, avgMargin };
}
