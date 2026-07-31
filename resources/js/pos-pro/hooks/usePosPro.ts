// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosPro.ts
//
// Hook مجمّع لصفحة POS PRO — مرتبط بالسلة المستقلة (usePosProCart) فقط.
// نفس نمط usePOS الكلاسيكي لكن دون الاعتماد على usePOSStore/useCartStore
// حتى لا تتداخل الحالة بين الصفحتين.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { usePosProCart } from '../store/usePosProCart';
import { calcTotals } from '@/pos/utils/calculations';

export function usePosPro(fiscalStampEnabled = true) {
  const items              = usePosProCart(s => s.items);
  const client             = usePosProCart(s => s.client);
  const invoiceDiscountPct = usePosProCart(s => s.invoiceDiscountPct);
  const payments           = usePosProCart(s => s.payments);
  const notes              = usePosProCart(s => s.notes);

  const addItem              = usePosProCart(s => s.addItem);
  const removeItem           = usePosProCart(s => s.removeItem);
  const updateQty            = usePosProCart(s => s.updateQty);
  const updateDiscount       = usePosProCart(s => s.updateDiscount);
  const updateDiscountAmount = usePosProCart(s => s.updateDiscountAmount);
  const updatePrice          = usePosProCart(s => s.updatePrice);
  const updatePackaging      = usePosProCart(s => s.updatePackaging);
  const clearCart            = usePosProCart(s => s.clearCart);
  const setClient            = usePosProCart(s => s.setClient);
  const setNotes             = usePosProCart(s => s.setNotes);
  const setPayments          = usePosProCart(s => s.setPayments);
  const setInvoiceDiscountPct = usePosProCart(s => s.setInvoiceDiscountPct);

  const totals = useMemo(
    () => calcTotals(items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt ?? false),
    [items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt],
  );

  return useMemo(() => ({
    items, client, invoiceDiscountPct, payments, notes, totals,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice, updatePackaging,
    clearCart, setClient, setNotes, setPayments, setInvoiceDiscountPct,
  }), [
    items, client, invoiceDiscountPct, payments, notes, totals,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice, updatePackaging,
    clearCart, setClient, setNotes, setPayments, setInvoiceDiscountPct,
  ]);
}
