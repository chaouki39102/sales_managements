// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════════════════════════════════════════════
// Hook موحَّد يجمع POSStore + CartStore
//
// ✅ إصلاح: calcFiscalStamp مستوردة من calculations.ts
//    (كانت مُضمَّنة inline بدون cap — الآن متطابقة مع LF 2024)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcFiscalStamp } from '../utils/calculations';

export function usePOS() {
  // ── POS Store ──────────────────────────────────────────────────────────────
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
  const holdCart          = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Cart Store ─────────────────────────────────────────────────────────────
  const items   = useCartStore(s => s.items);
  const client  = useCartStore(s => s.client);

  const addItem        = useCartStore(s => s.addItem);
  const removeItem     = useCartStore(s => s.removeItem);
  const updateQty      = useCartStore(s => s.updateQty);
  const updateDiscount = useCartStore(s => s.updateDiscount);
  const updatePrice    = useCartStore(s => s.updatePrice);
  const clearCart      = useCartStore(s => s.clearCart);
  const setClient      = useCartStore(s => s.setClient);

  // ── Computed totals ────────────────────────────────────────────────────────
  // ✅ calcFiscalStamp من calculations.ts — cap 3000 دج عند >= 300,000 دج (LF 2024)
  const totals = useMemo(() => {
    const totalHt       = items.reduce((s, i) => s + i.total_ht,          0);
    const totalTva      = items.reduce((s, i) => s + (i.total_ht * i.tva_rate / 100), 0);
    const totalDiscount = items.reduce((s, i) => s + i.discount_amount,   0);
    const totalTtc      = totalHt + totalTva;
    const fiscalStamp   = calcFiscalStamp(totalTtc);   // ✅ موحَّدة

    return {
      total_ht:       Math.round(totalHt       * 100) / 100,
      total_tva:      Math.round(totalTva      * 100) / 100,
      total_ttc:      Math.round(totalTtc      * 100) / 100,
      total_discount: Math.round(totalDiscount * 100) / 100,
      fiscal_stamp:   fiscalStamp,
      items_count:    items.reduce((s, i) => s + i.quantity, 0),
      lines_count:    items.length,
    };
  }, [items]);

  return {
    // Session
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    // Held carts
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    // UI
    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    // Cart
    items, client,
    addItem, removeItem, updateQty, updateDiscount, updatePrice,
    clearCart, setClient,
    totals,
  };
}
