// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosClearCart.ts
//
// Clear-cart with a 20-second undo window (snapshot of items, client, note,
// invoice discount and the edited document meta).
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback } from 'react';
import { useCartStore } from '@/pos/utils/useCartStore';
import type { useConfirm } from '@/hooks/useConfirm';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { CartItem, Party } from '@/types';
import type { PosState } from './posPageTypes';
import type { usePosEditingState } from './usePosEditingState';

export function usePosClearCart(params: {
  isEmpty: boolean;
  confirmOnClear: boolean;
  cartNote: string;
  setCartNote: (note: string) => void;
  clearCartConfirm: ReturnType<typeof useConfirm>;
  posRef: { readonly current: PosState };
  safeToast: PosSafeToast;
  editing: ReturnType<typeof usePosEditingState>;
}) {
  const { isEmpty, confirmOnClear, cartNote, setCartNote, clearCartConfirm, posRef, safeToast, editing } = params;
  const {
    clearEditingState, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef,
  } = editing;

  const lastClearedSnapshotRef = useRef<{
    items: CartItem[];
    client: Party | null;
    note: string;
    invoiceDiscountPct: number;
    documentId?: number | null;
    documentNumber?: string | null;
    documentDate?: string | null;
  } | null>(null);
  const [canUndoClear, setCanUndoClear] = useState(false);
  const [undoClearSecondsLeft, setUndoClearSecondsLeft] = useState(0);
  const undoClearTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const undoClearIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const handleClearCart = useCallback(async (opts?: { skipConfirm?: boolean }) => {
    if (isEmpty) { clearEditingState(); return; }
    if (confirmOnClear && !opts?.skipConfirm) {
      if (!await clearCartConfirm.confirm('هل تريد مسح كل الأصناف من السلة؟')) return;
    }

    const csSnap = useCartStore.getState();
    lastClearedSnapshotRef.current = {
      items:               [...posRef.current.items],
      client:              posRef.current.client,
      note:                cartNote,
      invoiceDiscountPct:  posRef.current.invoiceDiscountPct,
      documentId:          csSnap.documentId ?? null,
      documentNumber:      csSnap.documentNumber ?? null,
      documentDate:        csSnap.documentDate ?? null,
    };
    setCanUndoClear(true);
    const UNDO_SECONDS = 20;
    setUndoClearSecondsLeft(UNDO_SECONDS);
    clearTimeout(undoClearTimerRef.current);
    clearInterval(undoClearIntervalRef.current);
    undoClearIntervalRef.current = setInterval(() => {
      setUndoClearSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    undoClearTimerRef.current = setTimeout(() => {
      lastClearedSnapshotRef.current = null;
      setCanUndoClear(false);
      setUndoClearSecondsLeft(0);
      clearInterval(undoClearIntervalRef.current);
    }, UNDO_SECONDS * 1000);

    posRef.current.clearCart();
    posRef.current.setInvoiceDiscountPct(0);
    setCartNote('');
    clearEditingState();
  }, [confirmOnClear, isEmpty, cartNote, clearCartConfirm, clearEditingState, posRef, setCartNote]);

  const handleUndoClear = useCallback(() => {
    const snap = lastClearedSnapshotRef.current;
    if (!snap) return;
    useCartStore.setState({
      items:              snap.items,
      client:             snap.client,
      invoiceDiscountPct: snap.invoiceDiscountPct,
    });
    if (snap.documentId) {
      useCartStore.getState().setDocumentMeta({
        id:     snap.documentId,
        number: snap.documentNumber ?? null,
        date:   snap.documentDate ?? null,
      });
      setEditingDocumentId(snap.documentId);
      setEditingDocumentDate(snap.documentDate ?? null);
      setEditingDocumentNumber(snap.documentNumber ?? null);
      editingPrevBalanceRef.current = undefined;
      editingDocMetaRef.current = null;
    }
    setCartNote(snap.note);
    lastClearedSnapshotRef.current = null;
    setCanUndoClear(false);
    setUndoClearSecondsLeft(0);
    clearTimeout(undoClearTimerRef.current);
    clearInterval(undoClearIntervalRef.current);
    safeToast.success('تم استرجاع السلة');
  }, [safeToast, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef, setCartNote]);

  return { canUndoClear, undoClearSecondsLeft, handleClearCart, handleUndoClear };
}
