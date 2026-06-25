import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS() {
  const heldCarts        = usePOSStore(s => s.heldCarts);
  const searchQuery      = usePOSStore(s => s.searchQuery);
  const selectedCategory = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen = usePOSStore(s => s.paymentModalOpen);

  const setSearch              = usePOSStore(s => s.setSearch);
  const setCategory            = usePOSStore(s => s.setCategory);
  const openPayment            = usePOSStore(s => s.openPayment);
  const closePayment           = usePOSStore(s => s.closePayment);
  const restoreCart            = usePOSStore(s => s.restoreCart);
  const deleteHeldCart         = usePOSStore(s => s.deleteHeldCart);

  const items              = useCartStore(s => s.items);
  const client             = useCartStore(s => s.client);
  const invoiceDiscountPct = useCartStore(s => s.invoiceDiscountPct);

  const addItem              = useCartStore(s => s.addItem);
  const removeItem           = useCartStore(s => s.removeItem);
  const updateQty            = useCartStore(s => s.updateQty);
  const updateDiscount       = useCartStore(s => s.updateDiscount);
  const updateDiscountAmount = useCartStore(s => s.updateDiscountAmount);
  const updatePrice          = useCartStore(s => s.updatePrice);
  const clearCart            = useCartStore(s => s.clearCart);
  const setClient            = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const totals = useMemo(
    () => calcTotals(items, invoiceDiscountPct),
    [items, invoiceDiscountPct],
  );

  const holdCart = useCallback((label?: string) => {
    usePOSStore.getState().holdCart({
      items, totals, client, label, clearCart,
    });
  }, [items, totals, client, clearCart]);

  return {
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    searchQuery, selectedCategory, paymentModalOpen,
    setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  };
}
