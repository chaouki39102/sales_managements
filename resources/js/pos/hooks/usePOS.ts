// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOS.ts
//
// ✅ التغييرات:
//   - updateDiscountAmount مُضافة (من useCartStore)
//   - باقي المنطق لم يتغير
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS() {
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const highestInvoice    = usePOSStore(s => s.highestInvoice);
  const invoiceTotals     = usePOSStore(s => s.invoiceTotals);
  const paymentsBreakdown = usePOSStore(s => s.paymentsBreakdown);
  const productsSold      = usePOSStore(s => s.productsSold);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // Cart
  const items             = useCartStore(s => s.items);
  const client            = useCartStore(s => s.client);
  const invoiceDiscountPct= useCartStore(s => s.invoiceDiscountPct);
  const addItem           = useCartStore(s => s.addItem);
  const removeItem        = useCartStore(s => s.removeItem);
  const updateQty         = useCartStore(s => s.updateQty);
  const updateDiscount    = useCartStore(s => s.updateDiscount);
  const updateDiscountAmount = useCartStore(s => s.updateDiscountAmount);  // ✅ جديد
  const updatePrice       = useCartStore(s => s.updatePrice);
  const clearCart         = useCartStore(s => s.clearCart);
  const setClient         = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const totals = useMemo(
    () => calcTotals(items, invoiceDiscountPct),
    [items, invoiceDiscountPct],
  );

  const holdCart = useCallback(() => {
    usePOSStore.getState().holdCart({
      items, totals, client, clearCart,
    });
  }, [items, totals, client, clearCart]);

  const restoreCart    = usePOSStore(s => s.restoreCart);
  const deleteHeldCart = usePOSStore(s => s.deleteHeldCart);

  return {
    sessionStarted, sessionInvoices, sessionSales,
    highestInvoice, invoiceTotals, paymentsBreakdown, productsSold,
    startSession, endSession, incrementSession,

    heldCarts, holdCart, restoreCart, deleteHeldCart,

    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct,
    addItem, removeItem, updateQty,
    updateDiscount,
    updateDiscountAmount,    // ✅ مُصدَّر
    updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  };
}
