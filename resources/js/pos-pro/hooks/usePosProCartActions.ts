// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProCartActions.ts
//
// Cart actions of POSProPage: add product (price level, weight, stock guard),
// *NN qty command, card +/−, cart selection with arrows, new sale / held-cart
// tabs, clear cart, price level, camera barcode scan.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { isVariantOutOfStock, getVariantPrice } from '@/pos/utils/posHelpers';
import { playAddSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import type { useConfirm } from '@/hooks/useConfirm';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { POSProCartHandle } from '@/pos-pro/components/POSProCart';
import type { CartItem, PriceLevel, ProductPackaging, ProductVariant } from '@/types';
import type { PosProState } from './usePosProDiscounts';
import type { PosProEditing } from './usePosProEditing';

export type WeightTarget =
  | { mode: 'add';  variant: ProductVariant }
  | { mode: 'edit'; item: CartItem };

export function usePosProCartActions(params: {
  pos: PosProState;
  posRef: { readonly current: PosProState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  clearConfirm: ReturnType<typeof useConfirm>;
  allVariants: ProductVariant[];
  allowNegSetting: boolean;
  priceLevelsList: PriceLevel[];
  selectedPriceLevelId: number | null;
  setSelectedPriceLevelId: (id: number | null) => void;
  selectedItemId: string | null;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setWeightTarget: (t: WeightTarget | null) => void;
  setCustomerModalOpen: (open: boolean) => void;
  cartHandleRef: React.RefObject<POSProCartHandle>;
  editing: PosProEditing;
}) {
  const {
    pos, posRef, settings, safeToast, clearConfirm, allVariants, allowNegSetting, priceLevelsList,
    selectedPriceLevelId, setSelectedPriceLevelId, selectedItemId, setSelectedItemId, setWeightTarget,
    setCustomerModalOpen, cartHandleRef, editing,
  } = params;
  const {
    clearEditingState, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef,
  } = editing;

  // ── إضافة منتج من المودال/المسح (يبقى المودال مفتوحاً لإضافة متعددة) ─────
  const handleAddItem = useCallback(async (v: ProductVariant, qty = 1, packaging: ProductPackaging | null = null) => {
    let effective = v;
    if (selectedPriceLevelId != null) {
      const price = getVariantPrice(v, selectedPriceLevelId, priceLevelsList);
      if (price !== v.default_selling_price_ht) {
        effective = { ...v, default_selling_price_ht: price };
      }
    }
    if (effective.is_sold_by_weight ?? effective.product?.is_sold_by_weight ?? false) {
      setWeightTarget({ mode: 'add', variant: effective });
      return;
    }
    if (isVariantOutOfStock(effective, allowNegSetting)) {
      safeToast.error(`${effective.product?.name ?? ''} نفد المخزون`);
      return;
    }
    if (effective.manages_stock && effective.current_stock !== undefined) {
      const packMult = packaging ? Math.max(1, Number(packaging.quantity) || 1) : 1;
      const existing = posRef.current.items.find(i => i.variant_id === effective.id);
      const already  = existing ? existing.quantity * (existing.pack_qty ?? 1) : 0;
      if (already + qty * packMult > effective.current_stock) {
        const ok = await clearConfirm.confirm(
          `${effective.product?.name ?? ''} — المخزون المتبقي ${effective.current_stock} فقط. هل تريد البيع بالرغم من ذلك؟`,
          { title: 'مخزون غير كافٍ', variant: 'warning', icon: 'ti-alert-triangle' },
        );
        if (!ok) return;
      }
    }
    const addedId = posRef.current.addItem(effective, qty, packaging);
    if (addedId) setSelectedItemId(addedId);
    if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
    safeToast.success(effective.product?.name ?? 'تمت الإضافة', { id: 'pos-pro-last-added', duration: 1500 });
  }, [selectedPriceLevelId, priceLevelsList, allowNegSetting, safeToast, clearConfirm, settings.playSoundOnAdd, settings.soundPreset, settings.soundVolume,
    setWeightTarget, posRef, setSelectedItemId]);

  // ── أمر الكمية في حقل البحث: *رقم + Enter يضبط كمية الصنف المحدد ──────────
  const handleQtyCommand = useCallback((qty: number) => {
    if (qty <= 0) {
      safeToast.error('الكمية يجب أن تكون أكبر من صفر', { id: 'pos-pro-qty-err', duration: 1500 });
      return;
    }
    const items = posRef.current.items;
    const targetId = selectedItemId ?? items[items.length - 1]?.id ?? null;
    if (!targetId) {
      safeToast.error('السلة فارغة — أضف صنفاً أولاً', { id: 'pos-pro-qty-sel', duration: 1500 });
      return;
    }
    if (!selectedItemId) setSelectedItemId(targetId);
    posRef.current.updateQty(targetId, qty);
    const itemName = items.find(i => i.id === targetId)?.product_name ?? '';
    safeToast.success(`${itemName} — الكمية ${qty}`, { id: 'pos-pro-qty-cmd', duration: 1200 });
  }, [selectedItemId, safeToast, posRef, setSelectedItemId]);

  // ── تغيير كمية صنف من بطاقة المنتج في المودال (+/−) ───────────────────────
  // نفس سلوك POS الكلاسيكي: qty<=0 يحذف السطر، وإلا يحدّث كمية أول سطر للصنف.
  const handleCardQtyChange = useCallback((variantId: number, qty: number) => {
    const item = posRef.current.items.find(i => i.variant_id === variantId);
    if (!item) return;
    if (qty <= 0) posRef.current.removeItem(item.id);
    else posRef.current.updateQty(item.id, qty);
  }, [posRef]);

  // ── حركة التحديد في السلة (الأسهم عندما يكون حقل البحث فارغاً) ────────────
  const moveCartSelection = useCallback((dir: 'up' | 'down') => {
    const items = posRef.current.items;
    if (items.length === 0) return;
    const cur = selectedItemId ?? null;
    let idx = cur ? items.findIndex(i => i.id === cur) : -1;
    if (idx === -1) idx = dir === 'down' ? 0 : items.length - 1;
    else idx = dir === 'down' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
    const next = items[idx];
    setSelectedItemId(next.id);
    requestAnimationFrame(() => cartHandleRef.current?.scrollToItemId(next.id));
  }, [selectedItemId, posRef, setSelectedItemId, cartHandleRef]);

  // ── بيع جديد: تعليق السلة الحالية (إن لم تكن فارغة) + سلة فارغة برقم جديد ─
  // السلة فارغة → لا ننشئ سلة فارغة أخرى ولا نرفع العداد (رقمها يبقى أقل رقم حر).
  const handleNewSale = useCallback(() => {
    const st = usePosProCart.getState();
    if (st.items.length > 0) {
      posRef.current.holdCart();
    }
    clearEditingState();
    setSelectedItemId(null);
    if (settings.openClientOnNewSale) {
      requestAnimationFrame(() => setCustomerModalOpen(true));
    }
  }, [clearEditingState, settings.openClientOnNewSale, posRef, setSelectedItemId, setCustomerModalOpen]);

  // ── استرجاع سلة معلقة من مودال السلال المعلقة — re-created every render ──
  const restoreHeldIntoEditing = (id: string) => {
    clearEditingState();
    const held = pos.restoreCart(id);
    if (held?.documentId) {
      setEditingDocumentId(held.documentId);
      setEditingDocumentDate(held.documentDate ?? null);
      setEditingDocumentNumber(held.documentNumber ?? null);
      editingPrevBalanceRef.current = null;
      editingDocMetaRef.current = { dueDate: null, typeCode: null, currencyId: null };
    }
  };

  // ── استرجاع سلة معلقة من تبويب رأس السلة (مع إعادة تعليق السلة الحالية) ──
  const handleRestoreHeld = useCallback((id: string) => {
    const st = usePosProCart.getState();
    if (st.items.length > 0) posRef.current.holdCart();
    clearEditingState();
    const held = pos.restoreCart(id);
    if (held?.documentId) {
      setEditingDocumentId(held.documentId);
      setEditingDocumentDate(held.documentDate ?? null);
      setEditingDocumentNumber(held.documentNumber ?? null);
      editingPrevBalanceRef.current = null;
      editingDocMetaRef.current = { dueDate: null, typeCode: null, currencyId: null };
    }
    setSelectedItemId(null);
  }, [pos, clearEditingState, posRef, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef, setSelectedItemId]);

  // ── إغلاق تبويب سلة معلقة ─────────────────────────────────────────────────
  const handleCloseHeld = useCallback((id: string) => {
    clearConfirm.confirm('إغلاق هذه السلة؟ ستفقد أصنافها.').then(ok => {
      if (ok) pos.deleteHeldCart(id);
    });
  }, [clearConfirm, pos]);

  // ── إغلاق السلة الحالية (تبويبها) → سلة فارغة جديدة برقم جديد ────────────
  const handleCloseCurrent = useCallback(() => {
    const st = usePosProCart.getState();
    if (st.items.length === 0) return; // فارغة — لا شيء لإغلاقه، لا نرفع العداد
    const doClose = () => {
      clearEditingState();
      pos.clearCart();
      pos.bumpSaleNumber();
      setSelectedItemId(null);
    };
    if (settings.confirmOnClear) {
      clearConfirm.confirm('إغلاق السلة الحالية؟ ستفقد أصنافها.').then(ok => { if (ok) doClose(); });
    } else {
      doClose();
    }
  }, [clearConfirm, clearEditingState, pos, settings.confirmOnClear, setSelectedItemId]);

  // ── مسح السلة بالكامل (شريط الاختصارات + زر السلة) — re-created every render
  const handleClearCart = () => {
    const doClear = () => { clearEditingState(); pos.clearCart(); setSelectedItemId(null); };
    if (settings.confirmOnClear) {
      clearConfirm.confirm('مسح السلة بالكامل؟').then(ok => { if (ok) doClear(); });
    } else {
      doClear();
    }
  };

  // ── قائمة الأسعار ────────────────────────────────────────────────────────
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
      if (priceEntry?.price) {
        pos.updatePrice(item.id, priceEntry.price * packQty);
      } else if (pl.discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - pl.discount_percent / 100) * packQty);
      }
    });
  }, [priceLevelsList, allVariants, pos, setSelectedPriceLevelId]);

  // ── مسح الباركود بالكاميرا ───────────────────────────────────────────────
  const handleCameraScan = useCallback((barcode: string) => {
    if (!barcode || barcode.length < 4) return;
    let variant = allVariants.find(v => v.barcode === barcode);
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
      return;
    }
    for (const v of allVariants) {
      const pkgs = (v.packagings ?? (v.product as any)?.packagings) as ProductPackaging[] | undefined;
      const match = pkgs?.find(p => p.barcode === barcode);
      if (match) { variant = v; break; }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
      return;
    }
    for (const v of allVariants) {
      const bcList = v.barcodes;
      if (bcList?.some((bc: { barcode: string }) => bc.barcode === barcode)) {
        variant = v; break;
      }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
    } else {
      safeToast.error('لم يتم العثور على المنتج');
    }
  }, [allVariants, allowNegSetting, handleAddItem, safeToast]);

  return {
    handleAddItem, handleQtyCommand, handleCardQtyChange, moveCartSelection,
    handleNewSale, handleRestoreHeld, restoreHeldIntoEditing, handleCloseHeld, handleCloseCurrent,
    handleClearCart, applyPriceLevel, handleCameraScan,
  };
}
