// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProEditing.ts
//
// "Editing an existing invoice" mode for POSProPage: the editing state
// (usePosProEditingState) and re-opening a saved invoice into the cart from
// the session invoices, the `?edit=` URL param, or after a reload mid-edit
// (usePosProInvoiceLoader).
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { apiGet } from '@/lib/api/core/client';
import { toLocalDateKey } from '@/lib/utils';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { documentLineToCartItem, documentPaymentsToCart } from '@/pos/utils/posSaleHelpers';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { CartItem } from '@/types';
import type { CommercialDocument } from '@/lib/api/core/types';
import type { PosProState } from './usePosProDiscounts';

export type PosProEditingDocMeta = { dueDate: string | null; typeCode: string | null; currencyId: number | null };

export function usePosProEditingState() {
  // ── تعديل فاتورة موجودة (من فواتير الجلسة أو رابط ?edit=) ───────────────
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);
  const [editingDocumentNumber, setEditingDocumentNumber] = useState<string | null>(null);
  const [cartNote, setCartNote] = useState('');
  const editingPrevBalanceRef = useRef<number | null>(null);
  const editingDocMetaRef = useRef<{
    dueDate: string | null; typeCode: string | null; currencyId: number | null;
  }>({ dueDate: null, typeCode: null, currencyId: null });

  const clearEditingState = useCallback(() => {
    setEditingDocumentId(null);
    setEditingDocumentDate(null);
    setEditingDocumentNumber(null);
    setCartNote('');
    editingPrevBalanceRef.current = null;
    editingDocMetaRef.current = { dueDate: null, typeCode: null, currencyId: null };
    usePosProCart.getState().setDocumentMeta({ id: null, number: null, date: null });
  }, []);

  return {
    editingDocumentId, setEditingDocumentId,
    editingDocumentDate, setEditingDocumentDate,
    editingDocumentNumber, setEditingDocumentNumber,
    cartNote, setCartNote,
    editingPrevBalanceRef, editingDocMetaRef,
    clearEditingState,
  };
}

export type PosProEditing = ReturnType<typeof usePosProEditingState>;

export function usePosProInvoiceLoader(params: {
  posRef: { readonly current: PosProState };
  safeToast: PosSafeToast;
  editing: PosProEditing;
  setShowSessionInvoices: React.Dispatch<React.SetStateAction<boolean>>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) {
  const { posRef, safeToast, editing, setShowSessionInvoices, searchParams, setSearchParams } = params;
  const {
    editingDocumentId, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    setCartNote, editingPrevBalanceRef, editingDocMetaRef,
  } = editing;

  // ── فتح فاتورة موجودة للتعديل (نفس تحويلات POS الكلاسيكي) ───────────────
  const handleOpenInvoice = useCallback(async (docId: number) => {
    const cartState = usePosProCart.getState();
    if (cartState.items.length > 0 && cartState._isDirty) posRef.current.holdCart();
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product.quantityDiscounts,lines.product_variant,lines.packaging,payments,payments.payment_mode',
      });
      if (!doc?.lines?.length) {
        safeToast.error('لا توجد أصناف في هذه الفاتورة');
        return;
      }

      const items: CartItem[] = doc.lines.map(documentLineToCartItem);

      const payments = documentPaymentsToCart(doc);

      usePosProCart.setState({ items, client: doc.party ?? null, payments, notes: doc.notes ?? '' });
      usePosProCart.getState().markClean();
      setEditingDocumentId(docId);
      setEditingDocumentDate(toLocalDateKey(doc.document_date) || null);
      setEditingDocumentNumber(doc.document_number ?? null);
      usePosProCart.getState().setDocumentMeta({
        id:     docId,
        number: doc.document_number ?? null,
        date:   toLocalDateKey(doc.document_date) || null,
      });
      editingPrevBalanceRef.current = doc.balance_data?.previous_balance ?? null;
      editingDocMetaRef.current = {
        dueDate:    doc.due_date ?? null,
        typeCode:   doc.document_type?.code ?? null,
        currencyId: doc.currency_id ?? null,
      };
      setCartNote(doc.notes ?? '');
      setShowSessionInvoices(false);
      safeToast.success(`تم فتح الفاتورة ${doc.document_number}`);
    } catch {
      safeToast.error('فشل تحميل الفاتورة');
    }
    // Setters and refs below are stable identities — listed for lint only.
  }, [safeToast, posRef, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef, setCartNote, setShowSessionInvoices]);

  // ── فتح فاتورة من رابط ?edit= ────────────────────────────────────────────
  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !openedFromUrlRef.current) {
      openedFromUrlRef.current = true;
      const id = Number(editId);
      if (id > 0) {
        handleOpenInvoice(id).then(() => setSearchParams({}, { replace: true }));
      }
    }
  }, [searchParams, handleOpenInvoice, setSearchParams]);

  // ── استرجاع وضع التعديل إذا أُعيد تحميل الصفحة أثناء تعديل فاتورة ─────────
  const restoredEditFromCartRef = useRef(false);
  useEffect(() => {
    if (restoredEditFromCartRef.current) return;
    restoredEditFromCartRef.current = true;
    const cs = usePosProCart.getState();
    if (cs.documentId && !editingDocumentId) {
      setEditingDocumentId(cs.documentId);
      setEditingDocumentDate(cs.documentDate ?? null);
      setEditingDocumentNumber(cs.documentNumber ?? null);
      editingPrevBalanceRef.current = null;
      editingDocMetaRef.current = { dueDate: null, typeCode: null, currencyId: null };
    }
  }, [editingDocumentId, setEditingDocumentId, setEditingDocumentDate, setEditingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef]);

  return { handleOpenInvoice };
}
