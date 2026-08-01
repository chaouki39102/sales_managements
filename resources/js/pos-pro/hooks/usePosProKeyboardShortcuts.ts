// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProKeyboardShortcuts.ts
//
// اختصارات لوحة المفاتيح لـ POS PRO — بنفس منظومة POS الكلاسيكي تماماً:
//   • نفس KB_DEFAULTS (مصدر واحد في useKeyboardMap).
//   • نفس التخزين المخصص لكل شركة (pos-kb-override-{slug}) — إعادة تخصيص
//     في أي صفحة تنعكس على كلتيهما.
//   • نفس مودال المساعدة القابل لإعادة التخصيص (KeyboardHelpModal).
//
// الفرق الوحيد: ربطها بحالة POS PRO المستقلة (usePosPro) بدل usePOS.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { matchOverrideFrom } from '@/pos/hooks/useKeyboardMap';
import type { CartItem } from '@/types';

/** Subset of usePosPro() used by keyboard shortcuts */
export interface PosProApi {
  items:      CartItem[];
  holdCart:   (label?: string) => void;
  clearCart:  () => void;
  updateQty:  (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}

export interface PosProShortcutsRefs {
  posRef:       { readonly current: PosProApi | null };
  overridesRef: { readonly current: Record<string, string[]> | null };
  scanRef:      { readonly current: HTMLInputElement | null };
  cartRef:      { readonly current: HTMLDivElement | null };
}

export interface PosProShortcutsState {
  isEmpty:      boolean;
  hasSession:   boolean;
  anyModalOpen: boolean;
  selectedItemId: string | null;
}

export interface PosProShortcutsSetters {
  setDrawerOpen:           React.Dispatch<React.SetStateAction<boolean>>;
  setPaymentOpen:          React.Dispatch<React.SetStateAction<boolean>>;
  setHeldOpen:             React.Dispatch<React.SetStateAction<boolean>>;
  setReturnsOpen:          React.Dispatch<React.SetStateAction<boolean>>;
  setHelpOpen:             React.Dispatch<React.SetStateAction<boolean>>;
  setManualOpen:           React.Dispatch<React.SetStateAction<boolean>>;
  setShowSessionInvoices:  React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings:         React.Dispatch<React.SetStateAction<boolean>>;
  setSessionOpen:          React.Dispatch<React.SetStateAction<boolean>>;
  setShowScanner:          React.Dispatch<React.SetStateAction<boolean>>;
  setCustomerModalOpen:    React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItemId:       React.Dispatch<React.SetStateAction<string | null>>;
}

export interface PosProShortcutsActions {
  toggleFullscreen: () => void;
  handleClearCart:  () => void;
  handleOpenDrawer: () => void;
  handleQuickCash:  () => void;
  handlePrintCart:  () => void;
  closeTopModal:    () => void;
  handleNewSale:    () => void;
  moveCartSelection:(dir: 'up' | 'down') => void;
}

export function usePosProKeyboardShortcuts(
  refs:    PosProShortcutsRefs,
  state:   PosProShortcutsState,
  setters: PosProShortcutsSetters,
  actions: PosProShortcutsActions,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!refs.posRef.current) return;
      const overrides = refs.overridesRef.current ?? {};
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (state.anyModalOpen) {
        if (matchOverrideFrom(overrides, 'escape', e)) {
          e.preventDefault();
          actions.closeTopModal();
        }
        return;
      }

      if (matchOverrideFrom(overrides, 'searchFocus', e))    { e.preventDefault(); refs.scanRef.current?.focus(); }
      if (matchOverrideFrom(overrides, 'focusCart', e))      { e.preventDefault(); if (document.activeElement === refs.scanRef.current) { const lastItem = refs.posRef.current!.items[refs.posRef.current!.items.length - 1]; if (lastItem) { setters.setSelectedItemId(lastItem.id); } else { refs.cartRef.current?.focus(); } } else { refs.scanRef.current?.focus(); } }
      if (matchOverrideFrom(overrides, 'payment', e))        { e.preventDefault(); if (!state.isEmpty) setters.setPaymentOpen(true); }
      if (matchOverrideFrom(overrides, 'quickCash', e))      { e.preventDefault(); if (!state.isEmpty) actions.handleQuickCash(); }
      if (matchOverrideFrom(overrides, 'holdCart', e))       { e.preventDefault(); if (!state.isEmpty) refs.posRef.current!.holdCart(); }
      if (matchOverrideFrom(overrides, 'manualProduct', e))  { e.preventDefault(); setters.setManualOpen(true); }
      if (matchOverrideFrom(overrides, 'heldCarts', e))      { e.preventDefault(); setters.setHeldOpen(true); }
      if (matchOverrideFrom(overrides, 'toggleHeld', e))     { e.preventDefault(); setters.setHeldOpen(true); }
      if (matchOverrideFrom(overrides, 'sessionInvoices', e)){ e.preventDefault(); setters.setShowSessionInvoices(true); }
      if (matchOverrideFrom(overrides, 'sessionStats', e))   { e.preventDefault(); setters.setSessionOpen(true); }
      if (matchOverrideFrom(overrides, 'preview', e))        { e.preventDefault(); if (!state.isEmpty) actions.handlePrintCart(); }
      if (matchOverrideFrom(overrides, 'fullscreen', e))     { e.preventDefault(); actions.toggleFullscreen(); }
      if (matchOverrideFrom(overrides, 'clearCart', e))      { e.preventDefault(); actions.handleClearCart(); }
      if (matchOverrideFrom(overrides, 'kbHelp', e))         { e.preventDefault(); setters.setHelpOpen(true); }
      if (matchOverrideFrom(overrides, 'returns', e))        { e.preventDefault(); if (state.hasSession) setters.setReturnsOpen(true); }
      if (matchOverrideFrom(overrides, 'openDrawer', e))     { e.preventDefault(); actions.handleOpenDrawer(); }
      if (matchOverrideFrom(overrides, 'settings', e))       { e.preventDefault(); setters.setShowSettings(true); }
      if (matchOverrideFrom(overrides, 'focusClient', e))    { e.preventDefault(); setters.setCustomerModalOpen(true); }
      if (matchOverrideFrom(overrides, 'newSale', e))        { e.preventDefault(); actions.handleNewSale(); }

      const items = refs.posRef.current!.items;

      if (!inInput) {
        // هدف زيادة/نقصان الكمية: الصنف المحدد إن وُجد، وإلا آخر صنف (نفس POS الكلاسيكي)
        const selId  = state.selectedItemId;
        const target = selId ? items.find(i => i.id === selId) : items[items.length - 1];
        if (matchOverrideFrom(overrides, 'qtyUp', e)   && target)                          { e.preventDefault(); refs.posRef.current!.updateQty(target.id, target.quantity + 1); }
        if (matchOverrideFrom(overrides, 'qtyDown', e) && target && target.quantity > 1)  { e.preventDefault(); refs.posRef.current!.updateQty(target.id, target.quantity - 1); }

        // الصنف المحدد: Enter / Ctrl++ / NumpadAdd يزيد، Ctrl+- / NumpadSubtract ينقص، Delete يحذف
        if (state.selectedItemId) {
          const item = items.find(i => i.id === state.selectedItemId);
          const isPlus  = e.key === 'Enter' || (e.ctrlKey && (e.key === '+' || e.code === 'Equal')) || e.code === 'NumpadAdd';
          const isMinus = (e.ctrlKey && e.key === '-') || e.code === 'NumpadSubtract';
          if (isPlus && item) { e.preventDefault(); refs.posRef.current!.updateQty(item.id, item.quantity + 1); }
          else if (isMinus && item && item.quantity > 1) { e.preventDefault(); refs.posRef.current!.updateQty(item.id, item.quantity - 1); }
          else if (e.key === 'Delete') { e.preventDefault(); refs.posRef.current!.removeItem(state.selectedItemId); setters.setSelectedItemId(null); }
        }

        // الأسهم ↑↓ تتنقل بين صفوف السلة (عندما يكون التركيز خارج حقول الإدخال)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          actions.moveCartSelection(e.key === 'ArrowDown' ? 'down' : 'up');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.isEmpty, state.hasSession, state.anyModalOpen, state.selectedItemId,
    actions.toggleFullscreen, actions.handleClearCart, actions.handleOpenDrawer,
    actions.handleQuickCash, actions.handlePrintCart, actions.closeTopModal,
    actions.handleNewSale, actions.moveCartSelection,
  ]);
}
