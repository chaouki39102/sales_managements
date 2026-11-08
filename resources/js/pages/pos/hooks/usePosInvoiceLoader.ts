// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosInvoiceLoader.ts
//
// Re-open a saved invoice in the cart for editing: from the session invoices
// modal, from the `?edit=<docId>` URL param, or after a reload mid-edit.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useCallback } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { apiGet } from '@/lib/api/core/client';
import { useCartStore } from '@/pos/utils/useCartStore';
import { toLocalDateKey } from '@/lib/utils';
import { documentLineToCartItem, documentPaymentsToCart } from '@/pos/utils/posSaleHelpers';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { CartItem, CommercialDocument } from '@/types';
import type { PosState } from './posPageTypes';
import type { usePosEditingState } from './usePosEditingState';

export function usePosInvoiceLoader(params: {
  isEmpty: boolean;
  posRef: { readonly current: PosState };
  safeToast: PosSafeToast;
  editing: ReturnType<typeof usePosEditingState>;
  setCartNote: (note: string) => void;
  setShowSessionInvoices: (open: boolean) => void;
  setSelectedCartItemId: (id: string | null) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) {
  const {
    isEmpty, posRef, safeToast, editing, setCartNote, setShowSessionInvoices,
    setSelectedCartItemId, searchRef, searchParams, setSearchParams,
  } = params;
  const {
    editingDocumentId, setEditingDocumentId, setEditingDocStatus, setEditingDocumentDate,
    setEditingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef,
  } = editing;

  const handleOpenInvoice = useCallback(async (docId: number) => {
    const cartState = useCartStore.getState();
    if (!isEmpty && cartState._isDirty) posRef.current.holdCart();
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product.quantityDiscounts,lines.product_variant,lines.packaging,payments,payments.payment_mode',
      });
      if (!doc?.lines?.length) {
        safeToast.error('لا توجد أصناف في هذه الفاتورة');
        return;
      }

      // الرصيد يُحسب داخل ProfessionalPaymentModal تلقائياً
      const items: CartItem[] = doc.lines.map(documentLineToCartItem);
      const payments = documentPaymentsToCart(doc);
      useCartStore.setState({
        items,
        client: doc.party ?? null,
        payments,
        notes: doc.notes ?? '',
      });
      useCartStore.getState().markClean();
      setEditingDocumentId(docId);
      setEditingDocStatus(doc.status);
      setEditingDocumentDate(toLocalDateKey(doc.document_date) || null);
      setEditingDocumentNumber(doc.document_number ?? null);
      useCartStore.getState().setDocumentMeta({
        id:     docId,
        number: doc.document_number ?? null,
        date:   toLocalDateKey(doc.document_date) || null,
      });
      editingPrevBalanceRef.current = doc.balance_data?.previous_balance;
      editingDocMetaRef.current = {
        dueDate:   doc.due_date ?? null,
        typeCode:  doc.document_type?.code ?? null,
        currencyId: doc.currency_id ?? null,
      };
      setCartNote(doc.notes ?? '');
      setShowSessionInvoices(false);
      safeToast.success(`تم فتح الفاتورة ${doc.document_number}`);
      // Select last cart row + focus search so user can immediately type *<digits> Enter
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        const loaded = useCartStore.getState().items;
        const last = loaded[loaded.length - 1];
        if (last) setSelectedCartItemId(last.id);
      });
    } catch {
      safeToast.error('فشل تحميل الفاتورة');
    }
    // Setters and refs below are stable identities — listed for lint only.
  }, [isEmpty, safeToast, posRef, setEditingDocumentId, setEditingDocStatus, setEditingDocumentDate,
    setEditingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef, setCartNote, setShowSessionInvoices,
    searchRef, setSelectedCartItemId]);

  // ── Auto-open document from URL param ?edit=docId ──────────────────────────
  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !openedFromUrlRef.current) {
      openedFromUrlRef.current = true;
      const id = Number(editId);
      if (id > 0) {
        handleOpenInvoice(id).then(() => {
          setSearchParams({}, { replace: true });
        });
      }
    }
  }, [searchParams, handleOpenInvoice, setSearchParams]);

  // ── Restore edit mode if the page was reloaded mid-edit ────────────────────
  const restoredEditFromCartRef = useRef(false);
  useEffect(() => {
    if (restoredEditFromCartRef.current) return;
    restoredEditFromCartRef.current = true;
    const cs = useCartStore.getState();
    if (cs.documentId && !editingDocumentId) {
      setEditingDocumentId(cs.documentId);
      setEditingDocumentDate(cs.documentDate ?? null);
      setEditingDocumentNumber(cs.documentNumber ?? null);
      editingPrevBalanceRef.current = undefined;
      editingDocMetaRef.current = null;
    }
  }, [editingDocumentId, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef]);

  return { handleOpenInvoice };
}
