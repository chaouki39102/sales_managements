// pages/portal/orders/components/ProductInfoModal.tsx
// Product details modal (gallery, price, stock, packaging choice, discount tiers, quantity + add).
import { proxyImage } from '@/lib/api/imageProxy';
import { fmtMoney, accentStyleFor } from '../../portalUtils';
import { cartKey, packFactorFor, unitOf, unitLabelFor, defaultPackagingFor, discountLabel, tierHint } from '../catalogPricing';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';

export default function ProductInfoModal(props: Omit<PortalOrdersState, 'infoProductId'> & { infoProductId: number }) {
  const {
    qty, setQty, pkg, setPkg, cart, infoProductId, setInfoProductId, setPimZoom, canOrder,
    showStock, showPrice, showUnit, showPackaging, allowChangePackaging, showDiscounts, showTva,
    byId, lineCalc, partyIsTvaExempt, addToCart, updateCartQty,
  } = props;

  const p = byId.get(infoProductId)!;
  const canSwitchPack = showPackaging && allowChangePackaging;
  const selectedPack =
    canSwitchPack && pkg[p.id] != null
      ? pkg[p.id]
      : (defaultPackagingFor(p)?.id ?? null);
  const factor = packFactorFor(p, selectedPack);
  const q = qty[p.id] ?? 1;
  const cl = lineCalc(p, selectedPack, q);
  const key = cartKey(p.id, selectedPack);
  const inCart = !!cart[key];
  const cartQty = inCart ? cart[key].quantity : q;
  const outOfStock = p.manages_stock && p.current_stock !== null && p.current_stock <= 0;
  const lowStock =
    !outOfStock && p.manages_stock && p.current_stock !== null && p.current_stock <= 8;
  const step = inCart ? cartQty : q;
  return (
    <div className="portal-pim" role="dialog" aria-modal="true" aria-label={`تفاصيل ${p.name}`}>
      <div className="portal-pim-backdrop" onClick={() => setInfoProductId(null)} />
      <div className="portal-pim-card" style={accentStyleFor(p.id)}>
        <button className="portal-pim-x" type="button" onClick={() => setInfoProductId(null)} aria-label="إغلاق تفاصيل المنتج">
          <i className="ti ti-x" />
        </button>

        <div className={`portal-pim-gallery${outOfStock ? ' oos' : ''}`}>
          {p.image ? (
            <button
              type="button"
              className="portal-pim-gallery-img"
              onClick={() => setPimZoom(true)}
              aria-label={`تكبير صورة ${p.name}`}
              title="اضغط لعرض الصورة بملء الشاشة"
            >
              <img src={proxyImage(p.image, 600) ?? p.image} alt={p.name} loading="lazy" />
              <span className="portal-pim-gallery-zoom"><i className="ti ti-zoom-in" /></span>
            </button>
          ) : (
            <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
          )}
          {showDiscounts && cl.discount > 0 && cl.tier && (
            <span className="portal-prod-badge">
              <i className="ti ti-discount-2" />
              {cl.tier.discount_percentage !== null && cl.tier.discount_percentage > 0
                ? `خصم ${cl.tier.discount_percentage}%`
                : discountLabel(cl.tier)}
            </span>
          )}
          {outOfStock && (
            <div className="portal-pim-oos">
              <i className="ti ti-basket-off" /> نفد المخزون
            </div>
          )}
        </div>

        <div className="portal-pim-info">
          <div className="portal-pim-name">{p.name}</div>
          <div className="portal-pim-ids">
            {p.ref ? (
              <span><i className="ti ti-hash" /> {p.ref}</span>
            ) : null}
            {p.barcode ? (
              <span dir="ltr"><i className="ti ti-barcode" /> {p.barcode}</span>
            ) : null}
          </div>

          {showPrice && (
            <div className="portal-pim-price-row">
              <div className="portal-pim-price">
                {cl.discount > 0 && cl.tier ? (
                  <>
                    <span className="portal-prod-price-old">{fmtMoney(cl.unitPrice)}</span>
                    <span className="portal-prod-price-now">
                      {fmtMoney(cl.unitPrice - cl.discount / Math.max(1, q))}
                    </span>
                  </>
                ) : (
                  <span className="portal-prod-price-now">{fmtMoney(cl.unitPrice)}</span>
                )}
                {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
              </div>
              {showDiscounts && cl.discount > 0 && cl.tier && (
                <span className="portal-pim-save">
                  <i className="ti ti-discount-2" /> وفّر {fmtMoney(cl.discount)}
                </span>
              )}
            </div>
          )}

          <div className="portal-pim-status">
            {showTva && (partyIsTvaExempt ? (
              <span className="portal-prod-exempt"><i className="ti ti-shield-check" /> معفى من TVA</span>
            ) : p.tva_rate > 0 ? (
              <span className="portal-pim-chip"><i className="ti ti-percentage" /> TVA {p.tva_rate}%</span>
            ) : null)}
            {showStock && p.manages_stock && p.current_stock !== null && (
              outOfStock ? (
                <span className="portal-prod-stock out"><i className="ti ti-alert-circle" /> نفد المخزون</span>
              ) : lowStock ? (
                <span className="portal-prod-stock low"><i className="ti ti-alert-triangle" /> كمية محدودة: {p.current_stock}</span>
              ) : (
                <span className="portal-prod-stock"><i className="ti ti-check" /> متوفر: {p.current_stock}</span>
              )
            )}
          </div>

          {showPackaging && (
            <div className="portal-pim-sec">
              <div className="portal-pim-sec-t">
                <i className="ti ti-box" /> {p.packagings.length > 0 ? 'اختر التعبئة' : 'التعبئة'}
              </div>
              <div className="portal-pim-packs">
                {p.packagings.length === 0 ? (
                  <button
                    type="button"
                    className={`portal-pim-pack${selectedPack === null ? ' on' : ''}`}
                    disabled={outOfStock}
                    onClick={() => setPkg((prev) => ({ ...prev, [p.id]: null }))}
                  >
                    <span className="portal-pim-pack-n">وحدة</span>
                    <span className="portal-pim-pack-s">{unitOf(p)}</span>
                    {showPrice && <span className="portal-pim-pack-p">{fmtMoney(p.unit_price_ht)}</span>}
                  </button>
                ) : (
                  p.packagings.map((pk) => (
                    <button
                      key={pk.id}
                      type="button"
                      className={`portal-pim-pack${selectedPack === pk.id ? ' on' : ''}`}
                      disabled={outOfStock || !canSwitchPack}
                      onClick={() => setPkg((prev) => ({ ...prev, [p.id]: pk.id }))}
                    >
                      <span className="portal-pim-pack-n">{pk.label || pk.code || `×${pk.quantity}`}</span>
                      <span className="portal-pim-pack-s">× {pk.quantity} {unitOf(p)}</span>
                      {showPrice && <span className="portal-pim-pack-p">{fmtMoney(pk.pack_price_ht)}</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {showDiscounts && p.discounts.length > 0 && (
            <div className="portal-pim-sec">
              <div className="portal-pim-sec-t"><i className="ti ti-discount-2" /> خصومات الكمية</div>
              <div className="portal-pim-discs">
                {p.discounts.map((d) => {
                  const active = cl.tier?.id === d.id;
                  return (
                    <span key={d.id} className={`portal-disc-chip${active ? ' on' : ''}`}>
                      <i className="ti ti-discount-2" /> {discountLabel(d)} <b>{tierHint(d)}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="portal-pim-cta">
            <div className="portal-pim-qtywrap">
              <span className="portal-pim-qty-lbl">الكمية</span>
              <div className="portal-prod-qty">
                <button
                  type="button"
                  onClick={() => addToCart(p.id, step - 1, selectedPack)}
                  disabled={step <= 1}
                  aria-label="تقليل الكمية"
                >
                  <i className="ti ti-minus" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={step}
                  onChange={(e) => {
                    const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                    if (inCart) updateCartQty(key, n);
                    else setQty((prev) => ({ ...prev, [p.id]: n }));
                  }}
                  aria-label="الكمية"
                />
                <button
                  type="button"
                  onClick={() => addToCart(p.id, step + 1, selectedPack)}
                  aria-label="زيادة الكمية"
                >
                  <i className="ti ti-plus" />
                </button>
              </div>
              {factor > 1 && (
                <span className="portal-pim-eq">= {step * factor} {unitOf(p)}</span>
              )}
            </div>
            {outOfStock ? (
              <button className="portal-pim-add off" type="button" disabled>
                <i className="ti ti-basket-off" /> غير متوفر حالياً
              </button>
            ) : inCart ? (
              <button className="portal-pim-add in" type="button" onClick={() => setInfoProductId(null)}>
                <i className="ti ti-check" /> أُضيف إلى السلة — موافق
              </button>
            ) : (
              <button
                className={`portal-pim-add${!canOrder ? ' off' : ''}`}
                type="button"
                disabled={!canOrder}
                onClick={() => { addToCart(p.id, q, selectedPack); setInfoProductId(null); }}
              >
                <i className="ti ti-basket-plus" /> أضف إلى السلة
              </button>
            )}
          </div>
          {!canOrder && (
            <div className="portal-pim-note">
              <i className="ti ti-info-circle" /> إرسال الطلبات معطل حالياً — يمكنك تصفح المنتجات فقط.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
