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
    () => calcTotals(items, invoiceDiscountPct, fiscalStampEnabled),
    [items, invoiceDiscountPct, fiscalStampEnabled],
  );

  const holdCart = useCallback((label?: string) => {
    usePOSStore.getState().holdCart({
      items, totals, client, label, clearCart,
    });
  }, [items, totals, client, clearCart]);

  // useMemo هنا مهم: بدونه، كان usePOS() يرجّع كائناً جديداً بكل render،
  // فأي useEffect/useCallback بـ POSPage.tsx يعتمد على `pos` كاملاً (مو
  // حقل محدد منه) — زي معالج سكانر الباركود ومعالج اختصارات لوحة
  // المفاتيح (كلاهما window.addEventListener) — كان يُعاد تركيبه (إزالة
  // + إضافة المستمع) بكل render، مو فقط لما تتغير بياناته فعلياً.
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
