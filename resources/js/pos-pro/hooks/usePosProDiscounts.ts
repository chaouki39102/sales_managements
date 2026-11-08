// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProDiscounts.ts
//
// Discount gates of POS PRO (desktop + mobile): line discount (% / amount)
// and invoice discount (%), each checked against maxDiscountPct and the
// manager-PIN threshold.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback } from 'react';
import { checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { usePosPro } from './usePosPro';

export type PosProState = ReturnType<typeof usePosPro>;

export type PosProPinRequest = {
  requestedDiscount: number;
  reason: 'max_exceeded' | 'pin_required';
  onSuccess: () => void;
} | null;

export function usePosProDiscounts(params: {
  posRef: { readonly current: PosProState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  setPinModal: (req: PosProPinRequest) => void;
}) {
  const { posRef, settings, safeToast, setPinModal } = params;

  // ── خصم الفاتورة مع بوابة المدير (PIN) ───────────────────────────────────
  const handleInvoiceDiscountChange = useCallback((pct: number) => {
    if (pct <= 0) { posRef.current.setInvoiceDiscountPct(0); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.setInvoiceDiscountPct(pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.setInvoiceDiscountPct(pct),
    });
  }, [settings, safeToast, posRef, setPinModal]);

  // ── خصم صنف مع بوابة المدير (PIN) ───────────────────────────────────────
  const handleItemDiscount = useCallback((id: string, pct: number) => {
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.updateDiscount(id, pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.updateDiscount(id, pct),
    });
  }, [settings, safeToast, posRef, setPinModal]);

  const handleItemDiscountAmount = useCallback((id: string, amount: number) => {
    const items = posRef.current.items;
    const item  = items.find(i => i.id === id);
    const gross = item ? item.unit_price_ht * item.quantity : 0;
    const pct   = gross > 0 ? Math.min(100, (amount / gross) * 100) : 0;
    if (pct <= 0) { posRef.current.updateDiscountAmount(id, amount); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.updateDiscountAmount(id, amount); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct.toFixed(1)}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.updateDiscountAmount(id, amount),
    });
  }, [settings, safeToast, posRef, setPinModal]);

  return { handleInvoiceDiscountChange, handleItemDiscount, handleItemDiscountAmount };
}
