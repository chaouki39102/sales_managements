// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosModalHandlers.ts
//
// Event handlers of the POSPage top bar and modals (new sale, receipt preview,
// held carts, manual product, qty, weight). Plain functions re-created every
// render — exactly like the inline JSX lambdas they replace.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { useCartStore } from '@/pos/utils/useCartStore';
import { makeFakeVariant } from '@/pos/utils/posHelpers';
import type { ActiveModal } from '@/pos/utils/posHelpers';
import { ttcToHt } from '@/pos/utils/calculations';
import { cartItemsToSnapshotItems } from '@/pos/utils/posSaleHelpers';
import type { ProfessionalCartHandle } from '@/pos/components/ProfessionalCart';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { ProductVariant } from '@/types';
import type { PosState } from './posPageTypes';
import type { usePosEditingState } from './usePosEditingState';

export function usePosModalHandlers(params: {
  pos: PosState;
  posRef: { readonly current: PosState };
  settings: POSSettings;
  safeToast: PosSafeToast;
  isEmpty: boolean;
  allowCreditSale: boolean;
  selectedCartItemId: string | null;
  setSelectedCartItemId: (id: string | null) => void;
  setModal: React.Dispatch<React.SetStateAction<ActiveModal>>;
  setReceiptSnapshot: (snap: POSSaleSnapshot | null) => void;
  editing: ReturnType<typeof usePosEditingState>;
  weightModalVariant: React.MutableRefObject<ProductVariant | null>;
  weightEditItemId: React.MutableRefObject<string | null>;
  cartApiRef: React.RefObject<ProfessionalCartHandle | null>;
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const {
    pos, posRef, settings, safeToast, isEmpty, allowCreditSale, selectedCartItemId, setSelectedCartItemId,
    setModal, setReceiptSnapshot, editing, weightModalVariant, weightEditItemId, cartApiRef, searchRef,
  } = params;
  const {
    clearEditingState, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef,
  } = editing;

  // ── Top bar ────────────────────────────────────────────────────────────────
  const handleTopBarNewSale = () => {
    clearEditingState();
    const cartState = useCartStore.getState();
    if (isEmpty || !cartState._isDirty) pos.clearCart(); else pos.holdCart();
    if (settings.openClientOnNewSale) {
      requestAnimationFrame(() => cartApiRef.current?.openCustomerModal());
    }
  };

  const handleTopBarReceipt = () => {
    if (!isEmpty) {
      const snapItems = cartItemsToSnapshotItems(pos.items);
      setReceiptSnapshot({
        items: snapItems,
        totals: { ...pos.totals, paid: 0, change: 0, remaining: pos.totals.total_ttc },
        docNumber: '', docDate: new Date().toISOString().slice(0, 10),
        payments: [],
      });
      setModal('receipt');
    }
  };

  // ── Held carts ─────────────────────────────────────────────────────────────
  const restoreHeldIntoEditing = (id: string) => {
    clearEditingState();
    const held = pos.restoreCart(id);
    if (held?.documentId) {
      setEditingDocumentId(held.documentId);
      setEditingDocumentDate(held.documentDate ?? null);
      setEditingDocumentNumber(held.documentNumber ?? null);
      editingPrevBalanceRef.current = undefined;
      editingDocMetaRef.current = null;
    }
  };

  const handleHeldRestore = (id: string) => {
    restoreHeldIntoEditing(id);
    setModal('none');
  };

  const handleHeldRestoreAndPay = (id: string) => {
    restoreHeldIntoEditing(id);
    if (allowCreditSale) setModal('payment');
  };

  // ── Receipt preview ────────────────────────────────────────────────────────
  const handleReceiptClose = () => {
    setModal('none');
    setReceiptSnapshot(null);
    clearEditingState();
  };

  const handleReceiptNewSale = () => {
    setModal('none');
    setReceiptSnapshot(null);
    clearEditingState();
    pos.clearCart();
    if (settings.openClientOnNewSale) {
      requestAnimationFrame(() => cartApiRef.current?.openCustomerModal());
    }
  };

  // ── Manual product ─────────────────────────────────────────────────────────
  const handleManualAdd = (name: string, priceTtc: number, qty: number, tvaRate: number) => {
    pos.addItem(makeFakeVariant(name, ttcToHt(priceTtc, tvaRate), tvaRate), qty);
    setModal('none');
  };

  // ── Qty modal ──────────────────────────────────────────────────────────────
  const handleQtyClose = () => {
    setModal('none');
    if (selectedCartItemId) {
      requestAnimationFrame(() => cartApiRef.current?.scrollToItemId(selectedCartItemId));
    }
  };

  const handleQtyConfirm = (qty: number) => {
    if (selectedCartItemId) pos.updateQty(selectedCartItemId, qty);
    setModal('none');
    if (selectedCartItemId) {
      requestAnimationFrame(() => cartApiRef.current?.scrollToItemId(selectedCartItemId));
    }
  };

  // ── Weight modal ───────────────────────────────────────────────────────────
  const handleWeightClose = () => { weightModalVariant.current = null; weightEditItemId.current = null; setModal('none'); };

  const handleWeightConfirm = (qty: number) => {
    const v = weightModalVariant.current!;
    const editId = weightEditItemId.current;
    weightModalVariant.current = null;
    weightEditItemId.current = null;
    setModal('none');

    if (editId) {
      posRef.current.updateQty(editId, qty);
      const items = useCartStore.getState().items;
      const updated = items.find(i => i.id === editId);
      if (updated) setSelectedCartItemId(updated.id);
      safeToast.success(v.product?.name ?? 'تم التحديث', { id: 'pos-last-added', duration: 1500 });
      requestAnimationFrame(() => {
        if (updated) cartApiRef.current?.scrollToItemId(updated.id);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
          });
        });
      });
    } else {
      posRef.current.addItem(v, qty, null);
      const items = useCartStore.getState().items;
      const added = items.find(i => i.variant_id === v.id);
      if (added) setSelectedCartItemId(added.id);
      safeToast.success(v.product?.name ?? 'تمت الإضافة', { id: 'pos-last-added', duration: 1500 });
      requestAnimationFrame(() => {
        if (added) cartApiRef.current?.scrollToItemId(added.id);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
          });
        });
      });
    }
  };

  return {
    handleTopBarNewSale, handleTopBarReceipt,
    handleHeldRestore, handleHeldRestoreAndPay,
    handleReceiptClose, handleReceiptNewSale,
    handleManualAdd, handleQtyClose, handleQtyConfirm,
    handleWeightClose, handleWeightConfirm,
  };
}
