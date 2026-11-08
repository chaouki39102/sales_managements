// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosAddItem.ts
//
// Add a product to the POSPage cart (price level, recent products, highlight
// stay-vs-advance, sound, focus), open the weight modal for weighed products,
// and the search-bar keyboard navigation (arrows / Enter / *NN qty command).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import { useCartStore } from '@/pos/utils/useCartStore';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ActiveModal } from '@/pos/utils/posHelpers';
import { playAddSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import type { ProfessionalCartHandle } from '@/pos/components/ProfessionalCart';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { PriceLevel, ProductPackaging, ProductVariant } from '@/types';
import type { PosState } from './posPageTypes';

export function usePosAddItem(params: {
  pos: PosState;
  posRef: { readonly current: PosState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  allVariants: ProductVariant[];
  filteredVariants: ProductVariant[];
  priceLevelsList: PriceLevel[];
  selectedPriceLevelId: number | null;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCartItemId: (id: string | null) => void;
  setRecentProducts: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
  setModal: React.Dispatch<React.SetStateAction<ActiveModal>>;
  weightModalVariant: React.MutableRefObject<ProductVariant | null>;
  weightEditItemId: React.MutableRefObject<string | null>;
  cartApiRef: React.RefObject<ProfessionalCartHandle | null>;
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const {
    pos, posRef, settings, safeToast, allVariants, filteredVariants, priceLevelsList, selectedPriceLevelId,
    setHighlightedIndex, setSelectedCartItemId, setRecentProducts, setModal,
    weightModalVariant, weightEditItemId, cartApiRef, searchRef,
  } = params;

  const handleAddItem = useCallback((v: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => {
    if (v.product?.is_sold_by_weight) {
      weightModalVariant.current = v;
      setModal('weight');
      return;
    }
    posRef.current.addItem(v, qty, packaging);
    // Apply the selected price level to the NEW item (addItem uses the product's
    // default_selling_price_ht; the level picker only re-priced existing rows).
    const activePlId = selectedPriceLevelId;
    if (activePlId) {
      // addItem already scaled unit_price_ht by packQty (default × pack) — the
      // level override must scale by the same packQty, otherwise a *12 box gets
      // re-priced as a single unit. Applied to every row of this variant so the
      // just-added (possibly merged) row is always the one re-priced.
      const priceEntry = v.prices?.find(pr => pr.price_level_id === activePlId);
      const pl         = priceLevelsList.find(p => p.id === activePlId);
      useCartStore.getState().items
        .filter(i => i.variant_id === v.id)
        .forEach(i => {
          const packQty = i.pack_qty ?? 1;
          if (priceEntry?.price) {
            pos.updatePrice(i.id, priceEntry.price * packQty);
          } else if (pl?.discount_percent) {
            pos.updatePrice(i.id, v.default_selling_price_ht * (1 - pl.discount_percent / 100) * packQty);
          }
        });
    }
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.id !== v.id);
      return [v, ...filtered].slice(0, 5);
    });
    // Auto-select + scroll to added item so user can immediately set qty via *<digits> Enter
    const items = useCartStore.getState().items;
    const added = items.find(i => i.variant_id === v.id);
    if (added) setSelectedCartItemId(added.id);
    // Highlight position: always computed against filteredVariants — the array
    // actually rendered on screen at click time (using allVariants here was wrong:
    // its order/membership differs from filteredVariants during search/category
    // filtering, so the highlighted index pointed at an unrelated card, several
    // rows away). This is also the single place that decides stay-vs-advance,
    // so settings.advanceOnAdd applies identically for every add path (click,
    // double-click, Enter) instead of only being handled inside handleEnter.
    const idx = filteredVariants.findIndex(fv => fv.id === v.id);
    if (settings.advanceOnAdd) {
      setHighlightedIndex(idx >= 0 ? (idx + 1 < filteredVariants.length ? idx + 1 : 0) : 0);
    } else if (idx >= 0) {
      setHighlightedIndex(idx);
    }
    safeToast.success(v.product?.name ?? v.variant_name ?? 'تمت الإضافة', {
      id: 'pos-last-added',
      duration: 1500,
    });
    if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
    if (settings.clearSearchOnAdd) posRef.current.setSearch('');
    // Focus search AFTER scrollToItemId's double-RAF cart-row focus finishes
    requestAnimationFrame(() => {
      if (added) cartApiRef.current?.scrollToItemId(added.id);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
        });
      });
    });
  }, [settings.clearSearchOnAdd, settings.advanceOnAdd, settings.playSoundOnAdd, settings.soundPreset, settings.soundVolume, filteredVariants, safeToast, selectedPriceLevelId, priceLevelsList, pos,
    weightModalVariant, setModal, posRef, setRecentProducts, setSelectedCartItemId, setHighlightedIndex, cartApiRef, searchRef]);

  // ── فتح مودال الميزان لتعديل كمية صنف موجود بالسلة ────────────────────────
  const handleWeightEdit = useCallback((cartItemId: string) => {
    const item = pos.items.find(i => i.id === cartItemId);
    if (!item) return;
    const variant = allVariants.find(v => v.id === item.variant_id);
    if (!variant) return;
    weightModalVariant.current = variant;
    weightEditItemId.current = cartItemId;
    setModal('weight');
  }, [pos.items, allVariants, weightModalVariant, weightEditItemId, setModal]);

  return { handleAddItem, handleWeightEdit };
}

export function usePosSearchNavigation(params: {
  pos: PosState;
  posRef: { readonly current: PosState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  filteredVariants: ProductVariant[];
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedCartItemId: string | null;
  allowNegSetting: boolean;
  stockPending: boolean;
  prevSearchRef: React.MutableRefObject<string>;
  skipNextSearchResetRef: React.MutableRefObject<boolean>;
  handleAddItem: (v: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
}) {
  const {
    pos, posRef, settings, safeToast, filteredVariants, highlightedIndex, setHighlightedIndex,
    selectedCartItemId, allowNegSetting, stockPending, prevSearchRef, skipNextSearchResetRef, handleAddItem,
  } = params;

  const handleQtyChange = useCallback((variantId: number, qty: number) => {
    const item = pos.items.find(i => i.variant_id === variantId);
    if (item) {
      if (qty <= 0) pos.removeItem(item.id);
      else pos.updateQty(item.id, qty);
    }
  }, [pos.items, pos.removeItem, pos.updateQty]);

  const handleArrowUp = useCallback(() => {
    setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredVariants.length - 1);
  }, [filteredVariants.length, setHighlightedIndex]);

  const handleArrowDown = useCallback(() => {
    setHighlightedIndex(prev => prev < filteredVariants.length - 1 ? prev + 1 : 0);
  }, [filteredVariants.length, setHighlightedIndex]);

  const handleEnter = useCallback(() => {
    // Qty command: *<digits> on Enter sets qty of selected cart row
    if (selectedCartItemId) {
      const qtyMatch = pos.searchQuery.trim().match(/^\*(\d+)$/);
        if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10);
        if (qty > 0) {
          posRef.current.updateQty(selectedCartItemId, qty);
          const itemName = posRef.current.items.find((i: any) => i.id === selectedCartItemId)?.product_name ?? '';
          safeToast.success(`${itemName} — الكمية ${qty}`, { id: 'pos-qty-cmd', duration: 1200 });
          skipNextSearchResetRef.current = true;
          posRef.current.setSearch(prevSearchRef.current);
        } else {
          safeToast.error('الكمية يجب أن تكون أكبر من صفر', { id: 'pos-qty-cmd-err', duration: 1500 });
        }
        return;
      }
    }
    // *<digits> mode but no selected item → nothing
    if (/^\*\d*$/.test(pos.searchQuery.trim())) return;
    // Normal: add highlighted (keyboardNav) or first result
    if (settings.keyboardNav) {
      const v = filteredVariants[highlightedIndex];
      if (v && !isVariantOutOfStock(v, allowNegSetting) && !(v.manages_stock && v.current_stock === undefined && stockPending)) {
        // Stay-vs-advance is now decided entirely inside handleAddItem
        // (based on settings.advanceOnAdd), so it isn't duplicated/raced here.
        handleAddItem(v);
      }
    } else {
      const first = filteredVariants[0];
      if (first && !isVariantOutOfStock(first, allowNegSetting) && !(first.manages_stock && first.current_stock === undefined && stockPending)) {
        handleAddItem(first);
      }
    }
  }, [selectedCartItemId, pos.searchQuery, settings.keyboardNav, safeToast, filteredVariants, highlightedIndex, allowNegSetting, stockPending, handleAddItem,
    posRef, skipNextSearchResetRef, prevSearchRef]);

  return { handleQtyChange, handleArrowUp, handleArrowDown, handleEnter };
}
