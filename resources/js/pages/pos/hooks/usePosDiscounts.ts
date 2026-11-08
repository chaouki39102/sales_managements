// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosDiscounts.ts
//
// Price level + discount gates (max discount / manager PIN) for POSPage.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback } from 'react';
import { checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { PriceLevel, ProductVariant } from '@/types';
import type { PinModalRequest, PosState } from './posPageTypes';

export function usePosDiscounts(params: {
  pos: PosState;
  settings: POSSettings;
  safeToast: PosSafeToast;
  allVariants: ProductVariant[];
  priceLevelsList: PriceLevel[];
  setSelectedPriceLevelId: (id: number | null) => void;
  setPinModal: (req: PinModalRequest) => void;
}) {
  const { pos, settings, safeToast, allVariants, priceLevelsList, setSelectedPriceLevelId, setPinModal } = params;

  // ── Price Level ────────────────────────────────────────────────────────────
  const applyPriceLevel = useCallback((plId: number | null) => {
    setSelectedPriceLevelId(plId);
    if (plId === null) {
      pos.items.forEach(item => {
        const variant   = allVariants.find(v => v.id === item.variant_id);
        const origPrice = variant?.default_selling_price_ht;
        const packQty   = item.pack_qty ?? 1;
        if (origPrice && origPrice * packQty !== item.unit_price_ht) pos.updatePrice(item.id, origPrice * packQty);
      });
      return;
    }
    const pl = priceLevelsList.find(p => p.id === plId);
    if (!pl) return;
    pos.items.forEach(item => {
      const variant    = allVariants.find(v => v.id === item.variant_id);
      const packQty    = item.pack_qty ?? 1;
      const priceEntry = variant?.prices?.find(pr => pr.price_level_id === plId);
      if (priceEntry?.price)               pos.updatePrice(item.id, priceEntry.price * packQty);
      else if (pl.discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - pl.discount_percent / 100) * packQty);
      }
    });
  }, [priceLevelsList, allVariants, pos, setSelectedPriceLevelId]);

  // ── Per-item discount gate (maxDiscountPct + PIN) ─────────────────────────
  const handleItemDiscount = useCallback((id: string, pct: number) => {
    const check = checkDiscountAllowed(pct, settings);
    if (!check.allowed && check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    if (!check.allowed && check.reason === 'pin_required') {
      setPinModal({ requestedDiscount: pct, reason: 'pin_required', onSuccess: () => pos.updateDiscount(id, pct) });
      return;
    }
    pos.updateDiscount(id, pct);
  }, [settings, pos, safeToast, setPinModal]);

  const handleItemDiscountAmount = useCallback((id: string, amount: number) => {
    const item  = pos.items.find(i => i.id === id);
    const gross = item ? item.unit_price_ht * item.quantity : 0;
    const pct   = gross > 0 ? Math.min(100, (amount / gross) * 100) : 0;
    if (pct <= 0) { pos.updateDiscountAmount(id, amount); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (!check.allowed && check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct.toFixed(1)}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    if (!check.allowed && check.reason === 'pin_required') {
      setPinModal({ requestedDiscount: pct, reason: 'pin_required', onSuccess: () => pos.updateDiscountAmount(id, amount) });
      return;
    }
    pos.updateDiscountAmount(id, amount);
  }, [settings, pos, safeToast, setPinModal]);

  // ── Invoice discount gate (re-created every render, like the inline prop) ──
  const handleInvoiceDiscountChange = (pct: number) => {
    const check = checkDiscountAllowed(pct, settings);
    if (!check.allowed && check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    if (!check.allowed && check.reason === 'pin_required') {
      setPinModal({ requestedDiscount: pct, reason: 'pin_required', onSuccess: () => pos.setInvoiceDiscountPct(pct) });
      return;
    }
    pos.setInvoiceDiscountPct(pct);
  };

  return { applyPriceLevel, handleItemDiscount, handleItemDiscountAmount, handleInvoiceDiscountChange };
}
