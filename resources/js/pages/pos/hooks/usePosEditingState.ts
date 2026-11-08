// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosEditingState.ts
//
// State of the "editing an existing invoice" mode in POSPage, plus the receipt
// snapshot shown after a sale.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useCartStore } from '@/pos/utils/useCartStore';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';

export type EditingDocMeta = { dueDate?: string | null; typeCode?: string | null; currencyId?: number | null; };

export function usePosEditingState() {
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [, setEditingDocStatus] = useState<string | null>(null);
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);
  const [editingDocumentNumber, setEditingDocumentNumber] = useState<string | null>(null);
  const editingPrevBalanceRef = useRef<number | undefined>(undefined) as React.MutableRefObject<number | undefined>;
  const editingDocMetaRef = useRef<{
    dueDate?:   string | null;
    typeCode?:  string | null;
    currencyId?: number | null;
  }>(null) as React.MutableRefObject<EditingDocMeta | null>;

  const clearEditingState = useCallback(() => {
    setEditingDocumentId(null);
    setEditingDocStatus(null);
    setEditingDocumentDate(null);
    setEditingDocumentNumber(null);
    editingPrevBalanceRef.current = undefined;
    editingDocMetaRef.current = null;
    useCartStore.getState().setDocumentMeta({ id: null, number: null, date: null });
  }, []);

  return {
    editingDocumentId, setEditingDocumentId,
    setEditingDocStatus,
    editingDocumentDate, setEditingDocumentDate,
    editingDocumentNumber, setEditingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef,
    clearEditingState,
  };
}

export function usePosReceiptState() {
  const [receiptSnapshot, setReceiptSnapshot] = useState<POSSaleSnapshot | null>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);

  const receiptSource = useMemo((): PipelineSource | null => {
    if (!receiptSnapshot) return null;
    return { type: 'pos-snapshot', snapshot: receiptSnapshot };
  }, [receiptSnapshot]);

  const lastPaymentRef = useRef<{
    paid: number;
    payments: Array<{ paymentModeId: number; amount: number }>;
    dueDate?: string;
  }>();

  return { receiptSnapshot, setReceiptSnapshot, receiptSnapshotRef, receiptSource, lastPaymentRef };
}
