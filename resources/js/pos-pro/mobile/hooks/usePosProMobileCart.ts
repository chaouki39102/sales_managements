// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/hooks/usePosProMobileCart.ts
//
// Cart actions of the mobile POS PRO screen: add product (same guards as the
// desktop, no weight modal in v1), swipe-to-remove + undo, discount gates
// (line / invoice, % or amount) and new sale.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { usePosProDiscounts } from '@/pos-pro/hooks/usePosProDiscounts';
import type { PosProPinRequest, PosProState } from '@/pos-pro/hooks/usePosProDiscounts';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import { checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import { playAddSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import type { useConfirm } from '@/hooks/useConfirm';
import type { CartItem, ProductPackaging, ProductVariant } from '@/types';

export type MobileSheet = 'none' | 'products' | 'customer' | 'discount' | 'held';

export function usePosProMobileCart(params: {
  posRef: { readonly current: PosProState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  clearConfirm: ReturnType<typeof useConfirm>;
  allowNegSetting: boolean;
  setPinModal: (req: PosProPinRequest) => void;
  setSheet: (sheet: MobileSheet) => void;
}) {
  const { posRef, settings, safeToast, clearConfirm, allowNegSetting, setPinModal, setSheet } = params;

  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [removedItem, setRemovedItem] = useState<{ item: CartItem; idx: number } | null>(null);
  const [discMode, setDiscMode] = useState<'pct' | 'amount'>('pct');
  const [discValue, setDiscValue] = useState('');

  // ── إضافة منتج (نفس حِرس سطح المكتب، بلا مودال وزن في v1) ────────────────
  const handleAddItem = useCallback((v: ProductVariant, packaging: ProductPackaging | null = null) => {
    const effective = v;
    if (effective.is_sold_by_weight ?? effective.product?.is_sold_by_weight ?? false) {
      posRef.current.addItem(effective, 1, packaging);
      safeToast.info(`${effective.product?.name ?? ''} — قم بتعديل الكمية في السلة`, { id: 'ppm-weight-hint', duration: 2000 });
    } else if (isVariantOutOfStock(effective, allowNegSetting)) {
      safeToast.error(`${effective.product?.name ?? ''} نفد المخزون`);
    } else {
      if (effective.manages_stock && effective.current_stock !== undefined) {
        const packMult = packaging ? Math.max(1, Number(packaging.quantity) || 1) : 1;
        const existing = posRef.current.items.find((i) => i.variant_id === effective.id);
        const already = existing ? existing.quantity * (existing.pack_qty ?? 1) : 0;
        if (already + packMult > effective.current_stock) {
          void clearConfirm.confirm(
            `${effective.product?.name ?? ''} — المخزون المتبقي ${effective.current_stock} فقط. هل تريد البيع بالرغم من ذلك؟`,
            { title: 'مخزون غير كافٍ', variant: 'warning', icon: 'ti-alert-triangle' },
          ).then((ok) => {
            if (!ok) return;
            const id = posRef.current.addItem(effective, 1, packaging);
            if (id) setJustAddedId(id);
            if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
          });
          return;
        }
      }
      const addedId = posRef.current.addItem(effective, 1, packaging);
      if (addedId) setJustAddedId(addedId);
      if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
    }
  }, [allowNegSetting, clearConfirm, settings.playSoundOnAdd, settings.soundPreset, settings.soundVolume, safeToast, posRef]);

  // ── حذف بسحب + تراجع ─────────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    const items = posRef.current.items;
    const idx = items.findIndex((i) => i.id === id);
    const item = items[idx];
    if (!item) return;
    setRemovedItem({ item, idx });
    posRef.current.removeItem(id);
  }, [posRef]);

  const undoRemove = useCallback(() => {
    if (!removedItem) return;
    const st = usePosProCart.getState();
    const items = [...st.items];
    items.splice(Math.min(removedItem.idx, items.length), 0, removedItem.item);
    usePosProCart.setState({ items });
    setRemovedItem(null);
  }, [removedItem]);

  useEffect(() => {
    if (!removedItem) return;
    const t = setTimeout(() => setRemovedItem(null), 4000);
    return () => clearTimeout(t);
  }, [removedItem]);

  // ── خصم صنف + خصم الفاتورة % (مع بوابة المدير) ──────────────────────────
  const {
    handleItemDiscount, handleItemDiscountAmount, handleInvoiceDiscountChange: applyInvoiceDiscount,
  } = usePosProDiscounts({ posRef, settings, safeToast, setPinModal });

  // ── خصم الفاتورة بالمبلغ (شيت الخصم) ────────────────────────────────────
  const applyInvoiceDiscountAmount = useCallback((amount: number) => {
    const origHt = posRef.current.totals.total_ht + (posRef.current.totals.invoice_discount_amount ?? 0);
    const pct = origHt > 0 ? Math.min(100, (amount / origHt) * 100) : 0;
    if (pct <= 0) { posRef.current.setInvoiceDiscountPct(0); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.setInvoiceDiscountPct(pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct.toFixed(1)}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.setInvoiceDiscountPct(pct),
    });
  }, [settings, safeToast, posRef, setPinModal]);

  const confirmDiscount = useCallback(() => {
    const n = Number(discValue);
    if (!Number.isFinite(n) || n <= 0) return;
    if (discMode === 'pct') applyInvoiceDiscount(Math.min(100, n));
    else applyInvoiceDiscountAmount(n);
    setSheet('none');
    setDiscValue('');
  }, [discMode, discValue, applyInvoiceDiscount, applyInvoiceDiscountAmount, setSheet]);

  // ── بيع جديد ─────────────────────────────────────────────────────────────
  const handleNewSale = useCallback(() => {
    const st = usePosProCart.getState();
    if (st.items.length > 0) posRef.current.holdCart();
    usePosProCart.getState().setDocumentMeta({ id: null, number: null, date: null });
    posRef.current.clearCart();
    posRef.current.setInvoiceDiscountPct(0);
  }, [posRef]);

  return {
    justAddedId, removedItem, setRemovedItem,
    discMode, setDiscMode, discValue, setDiscValue,
    handleAddItem, handleRemove, undoRemove,
    handleItemDiscount, handleItemDiscountAmount, confirmDiscount,
    handleNewSale,
  };
}
