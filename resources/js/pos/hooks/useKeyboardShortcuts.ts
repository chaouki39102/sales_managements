// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/useKeyboardShortcuts.ts
//
// معالج اختصارات لوحة المفاتيح الرئيسي لشاشة POS — مستخرج من POSPage
// ليقلل حجم الملف ويجعل إعادة تركيب المعالج أسرع (يعتمد على refs فقط
// للبيانات المتغيرة بكثرة مثل pos.items).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchOverrideFrom } from './useKeyboardMap';
import { useCartStore } from '../utils/useCartStore';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CartItem } from '@/types';
import type { ActiveModal } from '../utils/posHelpers';

/** Subset of the usePOS() return used by keyboard shortcuts */
export interface POSApi {
  items:          CartItem[];
  searchQuery:    string;
  totals:         { total_ht: number; total_tva: number; total_ttc: number; fiscal_stamp: number; total_discount: number; paid: number; change: number; remaining: number } | null;
  holdCart:       () => void;
  clearCart:      () => void;
  setCategory:    (id: number | null) => void;
  updateQty:      (id: string, qty: number) => void;
  removeItem:     (id: string) => void;
}

export interface KeyboardShortcutsRefs {
  posRef:         RefObject<POSApi>;
  overridesRef:   RefObject<Record<string, string[]>>;
  searchRef:      RefObject<HTMLInputElement | null>;
  cartRef:        RefObject<HTMLDivElement | null>;
  cartApiRef:     RefObject<{ scrollToItemId: (id: string) => void; openCustomerModal: () => void } | null>;
}

export interface KeyboardShortcutsState {
  isEmpty:               boolean;
  modal:                 ActiveModal;
  showFilter:            boolean;
  showSessionInvoices:   boolean;
  showSettings:          boolean;
  showCloseSession:      boolean;
  pinModal:              { requestedDiscount: number; reason: string; onSuccess: () => void } | null;
  selectedCartItemId:    string | null;
  families:              Array<{ id: number }>;
  openClientOnNewSale:  boolean;
}

export interface KeyboardShortcutsSetters {
  setModal:              React.Dispatch<React.SetStateAction<ActiveModal>>;
  setFilter:             React.Dispatch<React.SetStateAction<boolean>>;
  setShowSessionInvoices:React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings:       React.Dispatch<React.SetStateAction<boolean>>;
  setShowCloseSession:   React.Dispatch<React.SetStateAction<boolean>>;
  setPinModal:           React.Dispatch<React.SetStateAction<{ requestedDiscount: number; reason: 'max_exceeded' | 'pin_required'; onSuccess: () => void } | null>>;
  setSelectedCartItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setView:               React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
  setGridSize:           React.Dispatch<React.SetStateAction<'xs' | 'sm' | 'md' | 'lg'>>;
  setReceiptSnapshot:    React.Dispatch<React.SetStateAction<POSSaleSnapshot | null>>;
}

export interface KeyboardShortcutsActions {
  toggleFullscreen:      () => void;
  handleClearCart:       () => void;
  handleOpenDrawer:      () => void;
  handleUndoClear:       () => void;
  handleToggleQuickbar:  () => void;
  handleSearchEscape:    () => void;
  handleQuickCash:       () => void;
  deleteConfirm:         { confirm: (msg: string, opts?: { title?: string; confirmText?: string; cancelText?: string; variant?: 'danger' | 'warning' | 'info' }) => Promise<boolean> };
}

export function useKeyboardShortcuts(
  refs:       KeyboardShortcutsRefs,
  state:      KeyboardShortcutsState,
  setters:    KeyboardShortcutsSetters,
  actions:    KeyboardShortcutsActions,
) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!refs.posRef.current) return;
      const overrides = refs.overridesRef.current ?? {};
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      const anyModalOpen = state.modal !== 'none' || state.showSessionInvoices || state.showSettings || state.showCloseSession || !!state.pinModal;
      if (anyModalOpen) {
        if (matchOverrideFrom(overrides, 'escape', e)) {
          e.preventDefault();
          if (state.modal !== 'none')                    setters.setModal('none');
          else if (state.showSessionInvoices)            setters.setShowSessionInvoices(false);
          else if (state.showSettings)                   setters.setShowSettings(false);
          else if (state.showCloseSession)               setters.setShowCloseSession(false);
          else if (state.pinModal)                       setters.setPinModal(null);
        }
        return;
      }

      if (matchOverrideFrom(overrides, 'searchFocus', e))  { e.preventDefault(); refs.searchRef.current?.focus(); }
      if (matchOverrideFrom(overrides, 'focusCart', e))    { e.preventDefault(); if (document.activeElement === refs.searchRef.current) { const lastItem = refs.posRef.current!.items[refs.posRef.current!.items.length - 1]; if (lastItem) { setters.setSelectedCartItemId(lastItem.id); refs.cartApiRef.current?.scrollToItemId(lastItem.id); } else { refs.cartRef.current?.focus(); } } else { refs.searchRef.current?.focus(); } }
      if (matchOverrideFrom(overrides, 'payment', e))      { e.preventDefault(); if (!state.isEmpty) { setters.setModal('payment'); } }
      if (matchOverrideFrom(overrides, 'quickCash', e))   { e.preventDefault(); if (!state.isEmpty) { actions.handleQuickCash(); } }
      if (matchOverrideFrom(overrides, 'holdCart', e))     { e.preventDefault(); if (!state.isEmpty) refs.posRef.current!.holdCart(); }
      if (matchOverrideFrom(overrides, 'manualProduct', e)){ e.preventDefault(); setters.setModal('manual'); }
      if (matchOverrideFrom(overrides, 'heldCarts', e))    { e.preventDefault(); setters.setModal('held'); }
      if (matchOverrideFrom(overrides, 'toggleHeld', e))   { e.preventDefault(); setters.setModal('held'); }
      if (matchOverrideFrom(overrides, 'sessionInvoices', e)) { e.preventDefault(); setters.setShowSessionInvoices(true); }
      if (matchOverrideFrom(overrides, 'sessionStats', e)) { e.preventDefault(); setters.setModal(m => m === 'session' ? 'none' : 'session'); }
      if (matchOverrideFrom(overrides, 'preview', e)) {
        e.preventDefault();
        if (!state.isEmpty) {
          const pos = refs.posRef.current;
          setters.setReceiptSnapshot({
            items: pos.items.map(i => ({
              name: i.product_name, ref: i.ref, qty: i.quantity,
              unit_price_ht: i.unit_price_ht, unit: i.unit_symbol,
              tva_rate: i.tva_rate / 100, discount_percentage: i.discount_percentage, total_ht: i.total_ht,
            })),
            totals: { ...pos.totals },
          } as POSSaleSnapshot);
          setters.setModal('receipt');
        }
      }
      if (matchOverrideFrom(overrides, 'fullscreen', e))  { e.preventDefault(); actions.toggleFullscreen(); }
      if (matchOverrideFrom(overrides, 'clearCart', e))    { e.preventDefault(); actions.handleClearCart(); }
      if (matchOverrideFrom(overrides, 'kbHelp', e))       { e.preventDefault(); setters.setModal('kbhelp'); }
      if (matchOverrideFrom(overrides, 'returns', e))      { e.preventDefault(); setters.setModal('returns'); }
      if (matchOverrideFrom(overrides, 'openDrawer', e))   { e.preventDefault(); actions.handleOpenDrawer(); }
      if (matchOverrideFrom(overrides, 'undoClear', e))    { e.preventDefault(); actions.handleUndoClear(); }
      if (matchOverrideFrom(overrides, 'newSale', e))      { e.preventDefault(); const cs = useCartStore.getState(); if (state.isEmpty || !cs._isDirty) { refs.posRef.current!.clearCart(); } else { refs.posRef.current!.holdCart(); } if (state.openClientOnNewSale) { setTimeout(() => refs.cartApiRef.current?.openCustomerModal(), 100); } }
      if (matchOverrideFrom(overrides, 'settings', e))     { e.preventDefault(); setters.setShowSettings(true); }
      if (matchOverrideFrom(overrides, 'toggleQuickbar', e)) { e.preventDefault(); actions.handleToggleQuickbar(); }
      if (matchOverrideFrom(overrides, 'kioskMode', e))    { e.preventDefault(); navigate('/pos/kiosk'); }
      if (matchOverrideFrom(overrides, 'closeSession', e)) { e.preventDefault(); setters.setShowCloseSession(true); }
      if (matchOverrideFrom(overrides, 'focusClient', e))   { e.preventDefault(); refs.cartApiRef.current?.openCustomerModal(); }

      if (!inInput) {
        if (matchOverrideFrom(overrides, 'gridView', e))   { e.preventDefault(); setters.setView('grid'); }
        if (matchOverrideFrom(overrides, 'listView', e))   { e.preventDefault(); setters.setView('list'); }
        if (matchOverrideFrom(overrides, 'zoomIn', e)) {
          e.preventDefault();
          setters.setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg');
        }
        if (matchOverrideFrom(overrides, 'zoomOut', e)) {
          e.preventDefault();
          setters.setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs');
        }
      }
      if (e.altKey && !isNaN(parseInt(e.key)) && !inInput) {
        const idx = parseInt(e.key) - 1;
        if (idx === -1) refs.posRef.current!.setCategory(null);
        else if (idx < state.families.length) refs.posRef.current!.setCategory(state.families[idx].id);
        e.preventDefault();
      }
      if (!inInput) {
        const inCart = refs.cartRef.current?.contains(document.activeElement);
        const lastItem = refs.posRef.current!.items[refs.posRef.current!.items.length - 1];
        if (matchOverrideFrom(overrides, 'qtyUp', e)   && lastItem && !inCart)                          { e.preventDefault(); refs.posRef.current!.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (matchOverrideFrom(overrides, 'qtyDown', e) && lastItem && lastItem.quantity > 1 && !inCart) { e.preventDefault(); refs.posRef.current!.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (matchOverrideFrom(overrides, 'deleteItem', e) && state.selectedCartItemId) {
          e.preventDefault();
          const id = state.selectedCartItemId;
          const name = refs.posRef.current!.items.find(i => i.id === id)?.product_name ?? '';
          actions.deleteConfirm.confirm(`هل تريد حذف "${name}" من السلة؟`, {
            title: 'حذف صنف',
            variant: 'danger',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
          }).then(ok => { if (ok) { refs.posRef.current!.removeItem(id); setters.setSelectedCartItemId(null); } });
        }
      }
      if (matchOverrideFrom(overrides, 'escape', e)) {
        if (state.modal !== 'none')                 setters.setModal('none');
        else if (state.showFilter)                  setters.setFilter(false);
        else if (!inInput && refs.posRef.current!.searchQuery) actions.handleSearchEscape();
      }

      // ── Cart row keyboard controls ─────────────────────────────────────
      if (!inInput && state.selectedCartItemId) {
        if (e.ctrlKey && e.key === '*') {
          e.preventDefault();
          setters.setModal('qty');
          return;
        }
        const isPlus  = e.key === 'Enter' || (e.ctrlKey && (e.key === '+' || e.code === 'Equal')) || e.code === 'NumpadAdd';
        const isMinus = (e.ctrlKey && e.key === '-') || e.code === 'NumpadSubtract';
        if (isPlus) {
          e.preventDefault();
          const item = refs.posRef.current!.items.find(i => i.id === state.selectedCartItemId);
          if (item) refs.posRef.current!.updateQty(item.id, item.quantity + 1);
        } else if (isMinus) {
          e.preventDefault();
          const item = refs.posRef.current!.items.find(i => i.id === state.selectedCartItemId);
          if (item && item.quantity > 1) refs.posRef.current!.updateQty(item.id, item.quantity - 1);
        }
      }

      // ── Arrow keys navigate cart rows (via cartApiRef) ─────────────────
      if (!inInput && refs.cartApiRef.current && state.selectedCartItemId && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const curIdx = refs.posRef.current!.items.findIndex(i => i.id === state.selectedCartItemId);
        if (curIdx >= 0) {
          e.preventDefault();
          const nextIdx = e.key === 'ArrowDown' ? curIdx + 1 : curIdx - 1;
          if (nextIdx >= 0 && nextIdx < refs.posRef.current!.items.length) {
            const nextItem = refs.posRef.current!.items[nextIdx];
            setters.setSelectedCartItemId(nextItem.id);
            refs.cartApiRef.current.scrollToItemId(nextItem.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.isEmpty, state.modal, state.showFilter, state.showSessionInvoices,
    state.showSettings, state.showCloseSession, state.pinModal,
    state.families, state.selectedCartItemId, state.openClientOnNewSale,
    actions.toggleFullscreen, actions.handleClearCart, actions.handleOpenDrawer,
    actions.handleUndoClear, actions.handleToggleQuickbar, actions.handleSearchEscape,
    navigate,
  ]);
}
