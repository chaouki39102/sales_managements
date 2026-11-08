// pages/portal/orders/components/CartItemsStep.tsx
// Cart drawer — cart step: note, editable cart lines, totals, continue to checkout.
import { proxyImage } from '@/lib/api/imageProxy';
import { fmtMoney, PortalEmpty, accentStyleFor } from '../../portalUtils';
import { unitLabelFor, discountLabel } from '../catalogPricing';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';

export default function CartItemsStep(props: PortalOrdersState) {
  const {
    isPublic, notes, setNotes, editingId, setCheckoutStep, noteOpen, setNoteOpen,
    handleRemoveItem, canOrder, showPrice, showDiscounts, showTva, lineCalc, partyIsTvaExempt,
    cartEntries, totals, updateCartQty,
  } = props;

  return (
    <>
      {!isPublic && (
        <div className={`portal-cart-note${noteOpen ? ' is-open' : ''}`}>
          <div className="portal-cart-note-hd" onClick={() => setNoteOpen((v) => !v)} role="button" aria-expanded={noteOpen}>
            <i className="ti ti-note" />
            <span>ملاحظة الطلب</span>
            <i className="ti ti-chevron-down portal-cart-note-caret" />
          </div>
          <textarea
            className="portal-form-input"
            placeholder="اكتب ملاحظتك هنا... (سيتم إرسالها مع الطلب)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      )}
      <div className="portal-cart-scroll">
        {cartEntries.length === 0 ? (
          <PortalEmpty icon="ti-basket" text={editingId ? 'هذا الطلب لا يحتوي على منتجات' : 'لم تضف أي منتج بعد'} />
        ) : (
          <div className="portal-cart">
            {cartEntries.map(({ key, product, entry }) => {
              const cl = lineCalc(product, entry.packaging_id, entry.quantity);
              return (
                <div key={key} className="portal-cart-item" style={accentStyleFor(product.id)}>
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
                        <>
                          {entry.quantity}
                          {cl.factor > 1 ? ` × ${cl.factor}` : ''}
                        </>
                      )}
                      {`/${unitLabelFor(product, entry.packaging_id)}`}
                      {showTva &&
                        (partyIsTvaExempt
                          ? ' • معفى من TVA'
                          : product.tva_rate > 0
                            ? ` • TVA ${product.tva_rate}%`
                            : '')}
                    </div>
                    {showDiscounts && showPrice && cl.discount > 0 && cl.tier && (
                      <div className="portal-cart-disc">
                        <i className="ti ti-discount-2" />
                        <span className="portal-cart-disc-txt">{discountLabel(cl.tier)}</span>
                        <span>-{fmtMoney(cl.discount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="portal-prod-qty">
                    <button type="button" onClick={() => updateCartQty(key, entry.quantity - 1)} disabled={entry.quantity <= 1}>
                      <i className="ti ti-minus" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={entry.quantity}
                      onChange={(e) => {
                        const n = Math.floor(Number(e.target.value));
                        if (!Number.isFinite(n) || n < 1) return;
                        updateCartQty(key, n);
                      }}
                    />
                    <button type="button" onClick={() => updateCartQty(key, entry.quantity + 1)}>
                      <i className="ti ti-plus" />
                    </button>
                  </div>
                  <div className="portal-cart-total">{showPrice ? fmtMoney(cl.ttc) : ''}</div>
                  <button className="portal-cart-x" type="button" onClick={() => handleRemoveItem(key, product.name)} title="إزالة">
                    <i className="ti ti-x" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="portal-drawer-foot">
        {showPrice ? (
          <div className="portal-cart-totals">
            <div className="portal-cart-total-row">
              <span>المجموع HT</span>
              <b>{fmtMoney(totals.ht)}</b>
            </div>
            {totals.discount > 0.004 && (
              <div className="portal-cart-total-row portal-cart-total-row--disc">
                <span>الخصم</span>
                <b>-{fmtMoney(totals.discount)}</b>
              </div>
            )}
            {totals.tva > 0.004 && (
              <div className="portal-cart-total-row">
                <span>TVA</span>
                <b>{fmtMoney(totals.tva)}</b>
              </div>
            )}
            <div className="portal-cart-total-row portal-cart-total-row--final">
              <span>المجموع (TTC)</span>
              <b>{fmtMoney(totals.ttc)}</b>
            </div>
          </div>
        ) : (
          <div className="portal-cart-totals portal-cart-totals--muted">
            <div className="portal-cart-total-row">
              <span>سيُحدَّد مبلغ الطلب من طرف المؤسسة عند التأكيد.</span>
            </div>
          </div>
        )}
        <button
          className="portal-btn portal-btn--em portal-btn--block"
          type="button"
          disabled={cartEntries.length === 0 || !canOrder}
          onClick={() => setCheckoutStep(true)}
        >
          <i className="ti ti-shopping-cart-check" />
          {editingId ? 'متابعة الحفظ' : 'إتمام الطلب'}
        </button>
      </div>
    </>
  );
}
