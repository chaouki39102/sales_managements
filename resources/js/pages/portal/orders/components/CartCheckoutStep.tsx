// pages/portal/orders/components/CartCheckoutStep.tsx
// Cart drawer — checkout step: customer fields (public mode), notes, read-only review, submit.
import { proxyImage } from '@/lib/api/imageProxy';
import { fmtMoney, accentStyleFor } from '../../portalUtils';
import { unitLabelFor } from '../catalogPricing';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';

export default function CartCheckoutStep(props: PortalOrdersState) {
  const {
    isPublic, notes, setNotes, customerName, setCustomerName, customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress, editingId, setCheckoutStep, showPrice, showNotes, lineCalc,
    cartEntries, submitCart, pendingSubmit,
  } = props;

  return (
    <div className="portal-drawer-body">
      {/* الخطوة التالية: بيانات الزبون + الملاحظات */}
      {isPublic && (
        <div className="portal-customer-fields">
          <div className="portal-customer-field">
            <input
              className="portal-form-input"
              placeholder="الاسم الكامل *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="portal-customer-field">
            <input
              className="portal-form-input"
              placeholder="رقم الهاتف *"
              dir="ltr"
              inputMode="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div className="portal-customer-field">
            <input
              className="portal-form-input"
              placeholder="العنوان (اختياري)"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </div>
      )}
      {showNotes && (
        <textarea
          className="portal-form-input"
          placeholder="ملاحظات (اختياري): مثلاً تاريخ التسليم المفضل..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      )}
      <div className="portal-checkout-review">
        {cartEntries.map(({ key, product, entry }) => {
          const cl = lineCalc(product, entry.packaging_id, entry.quantity);
          return (
            <div key={key} className="portal-cart-item portal-cart-item--ro" style={accentStyleFor(product.id)}>
              <div className="portal-cart-thumb">
                {product.image ? (
                  <img src={proxyImage(product.image) ?? product.image} alt="" loading="lazy" />
                ) : (
                  <i className="ti ti-package" />
                )}
              </div>
              <div className="portal-cart-info">
                <div className="portal-prod-name">{product.name}</div>
                <div className="portal-prod-ref">
                  {showPrice ? (
                    <>
                      {entry.quantity} × {fmtMoney(cl.unitPrice)}
                      {cl.factor > 1 ? ` ×${cl.factor}` : ''}
                    </>
                  ) : (
                    <>{entry.quantity}{cl.factor > 1 ? ` × ${cl.factor}` : ''}</>
                  )}
                  {`/${unitLabelFor(product, entry.packaging_id)}`}
                </div>
              </div>
              {showPrice && <div className="portal-cart-total">{fmtMoney(cl.ttc)}</div>}
            </div>
          );
        })}
      </div>
      <div className="portal-cart-actions">
        <button
          className="portal-btn portal-btn--ghost"
          disabled={pendingSubmit}
          onClick={() => setCheckoutStep(false)}
          type="button"
        >
          <i className="ti ti-arrow-right" /> رجوع إلى السلة
        </button>
        <button
          className="portal-btn portal-btn--em"
          disabled={pendingSubmit || cartEntries.length === 0}
          onClick={submitCart}
          type="button"
        >
          {pendingSubmit ? (
            <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</>
          ) : editingId ? (
            <><i className="ti ti-device-floppy" /> حفظ التعديلات</>
          ) : (
            <><i className="ti ti-send" /> إرسال الطلب</>
          )}
        </button>
      </div>
    </div>
  );
}
