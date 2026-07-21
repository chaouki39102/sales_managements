import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS(fiscalStampEnabled = true) {
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
  const payments           = useCartStore(s => s.payments);

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
    () => calcTotals(items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt ?? false),
    [items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt],
  );

  const holdCart = useCallback((label?: string) => {
    usePOSStore.getState().holdCart({
      items, totals, client, label, clearCart,
    });
  }, [items, totals, client, clearCart]);

  return useMemo(() => ({
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    searchQuery, selectedCategory, paymentModalOpen,
    setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct, payments,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  }), [
    heldCarts, holdCart, restoreCart, deleteHeldCart,
    searchQuery, selectedCategory, paymentModalOpen,
    setSearch, setCategory, openPayment, closePayment,
    items, client, invoiceDiscountPct, payments,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  ]);
}
