// pages/portal/orders/components/CartDrawer.tsx
// Side cart drawer shell (header actions) switching between cart and checkout steps.
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';
import CartCheckoutStep from './CartCheckoutStep';
import CartItemsStep from './CartItemsStep';

export default function CartDrawer(props: PortalOrdersState) {
  const {
    isPublic, editingId, setDrawerOpen, checkoutStep, noteOpen, setNoteOpen, handleClearCart,
    showNotes, cartEntries,
  } = props;

  return (
    <div className="portal-drawer">
      <div className="portal-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      <aside className="portal-cart-drawer" role="dialog" aria-modal="true" aria-label="سلة الطلب">
        <div className="portal-drawer-hd">
          <h3>
            <i className={checkoutStep ? 'ti ti-shopping-cart-check' : 'ti ti-basket'} />
            {checkoutStep
              ? (editingId ? 'حفظ التعديلات' : 'إتمام الطلب')
              : (editingId ? 'تعديل الطلب' : 'سلة الطلب')}
            {!checkoutStep && cartEntries.length > 0 && (
              <span className="portal-drawer-count">{cartEntries.length}</span>
            )}
          </h3>
          {!checkoutStep && (
            <span className="portal-drawer-actions">
              {showNotes && !isPublic && (
                <button
                  className={`portal-drawer-act${noteOpen ? ' is-on' : ''}`}
                  type="button"
                  title={noteOpen ? 'إخفاء الملاحظة' : 'إضافة ملاحظة'}
                  onClick={() => setNoteOpen((v) => !v)}
                >
                  <i className="ti ti-note" />
                </button>
              )}
              {cartEntries.length > 0 && (
                <button
                  className="portal-drawer-act portal-drawer-act--del"
                  type="button"
                  title="إفراغ السلة"
                  onClick={() => handleClearCart()}
                >
                  <i className="ti ti-trash" />
                </button>
              )}
              <button className="portal-drawer-x" type="button" onClick={() => setDrawerOpen(false)} aria-label="إغلاق السلة">
                <i className="ti ti-x" />
              </button>
            </span>
          )}
        </div>

        {checkoutStep ? (
          <CartCheckoutStep {...props} />
        ) : (
          <CartItemsStep {...props} />
        )}
      </aside>
    </div>
  );
}
