// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════════════════════════════════════════════
// Hook موحَّد يجمع POSStore + CartStore
//
// ✅ إصلاح: calcFiscalStamp مستوردة من calculations.ts
//    (كانت مُضمَّنة inline بدون cap — الآن متطابقة مع LF 2024)
// ✅ invoiceDiscountPct من useCartStore
// ✅ holdCart يمرر items/totals/client/clearCart كمعاملات
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS() {
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const posHoldCart       = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Derive totals from stable selectors (NOT s.totals() which creates new ref each call) ──
  const items   = useCartStore(s => s.items);
  const client  = useCartStore(s => s.client);
  const invoiceDiscountPct = useCartStore(s => s.invoiceDiscountPct);
  const totals  = useMemo(() => calcTotals(items, invoiceDiscountPct), [items, invoiceDiscountPct]);

  const addItem        = useCartStore(s => s.addItem);
  const removeItem     = useCartStore(s => s.removeItem);
  const updateQty      = useCartStore(s => s.updateQty);
  const updateDiscount = useCartStore(s => s.updateDiscount);
  const updatePrice    = useCartStore(s => s.updatePrice);
  const clearCart      = useCartStore(s => s.clearCart);
  const setClient      = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const holdCart = useCallback((label?: string) => {
    const state = useCartStore.getState();
    posHoldCart({
      items:     state.items,
      totals:    calcTotals(state.items, state.invoiceDiscountPct),
      client:    state.client,
      label,
      clearCart: state.clearCart,
    });
  }, [posHoldCart]);

  return {
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    heldCarts, holdCart, restoreCart, deleteHeldCart,

    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct,
    addItem, removeItem, updateQty, updateDiscount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  };
}
