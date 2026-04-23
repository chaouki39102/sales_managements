// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════
// Hook موحّد يجمع POSStore + CartStore
// ════════════════════════════════════
import { usePOSStore } from './usePOSStore';
import { useCartStore } from '../utils/useCartStore';

export function usePOS() {
  // ── POS Store ──────────────────────────────
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

  // ── Cart Store ─────────────────────────────
  const items             = useCartStore(s => s.items);
  const client            = useCartStore(s => s.client);
  const addItem           = useCartStore(s => s.addItem);
  const removeItem        = useCartStore(s => s.removeItem);
  const updateQty         = useCartStore(s => s.updateQty);
  const clearCart         = useCartStore(s => s.clearCart);
  const setClient         = useCartStore(s => s.setClient);
  const totals            = useCartStore(s => s.totals);

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
    items, client, addItem, removeItem, updateQty, clearCart, setClient, totals,
  };
}
