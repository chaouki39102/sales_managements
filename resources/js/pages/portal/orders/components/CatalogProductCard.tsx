// pages/portal/orders/components/CatalogProductCard.tsx
// One catalog product card (image, discounts, quick add / qty, price, stock, packaging).
import { proxyImage } from '@/lib/api/imageProxy';
import type { PortalCatalogItem } from '@/lib/api/portal/portal';
import { fmtMoney, accentStyleFor } from '../../portalUtils';
import { cartKey, packFactorFor, unitOf, unitLabelFor, defaultPackagingFor, discountLabel, tierHint } from '../catalogPricing';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';

export default function CatalogProductCard(props: PortalOrdersState & { p: PortalCatalogItem }) {
  const {
    qty, pkg, setPkg, cart, setInfoProductId, canOrder, showStock, showPrice, showRef, showUnit,
    showPackaging, allowChangePackaging, showDiscounts, showTva, showIncartBadge, lineCalc,
    partyIsTvaExempt, addToCart, updateCartQty, p,
  } = props;

  const defaultPack = defaultPackagingFor(p);
  // عند إخفاء التعبئة (أو منع تغييرها) تُجبر التعبئة الافتراضية فقط
  // «وحدة» ليست خياراً للمنتجات ذات التعبئات — إن مُنعت مسبقاً تعود للتعبئة الافتراضية.
  const canSwitchPack = showPackaging && allowChangePackaging;
  const selectedPack =
    canSwitchPack && pkg[p.id] != null
      ? pkg[p.id]
      : (defaultPack?.id ?? null);
  const factor = packFactorFor(p, selectedPack);
  const q = qty[p.id] ?? 1;
  const cl = lineCalc(p, selectedPack, q);
  const key = cartKey(p.id, selectedPack);
  const inCart = !!cart[key];
  const cartQty = inCart ? cart[key].quantity : q;
  const outOfStock = p.manages_stock && p.current_stock !== null && p.current_stock <= 0;
  const lowStock =
    !outOfStock && p.manages_stock && p.current_stock !== null && p.current_stock <= 8;
  return (
    <div
      key={p.id}
      className={`portal-prod portal-prod--info${inCart ? ' on' : ''}${outOfStock ? ' oos' : ''}`}
      style={accentStyleFor(p.id)}
      onClick={() => setInfoProductId(p.id)}
      aria-label={`عرض تفاصيل ${p.name}`}
    >
      <div className={`portal-prod-img${outOfStock ? ' oos' : ''}`}>
        {p.image ? (
          <img src={proxyImage(p.image) ?? p.image} alt={p.name} loading="lazy" />
        ) : (
          <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
        )}
        <button
          type="button"
          className="portal-prod-zoom"
          onClick={(e) => { e.stopPropagation(); setInfoProductId(p.id); }}
          aria-label={`تكبير ${p.name}`}
          title="عرض التفاصيل"
        >
          <i className="ti ti-arrows-maximize" />
        </button>
        {showDiscounts && p.discounts.length > 0 && (
          <div className="portal-prod-discs portal-prod-discs--ov">
            {p.discounts.map((d) => {
              const active = cl.tier?.id === d.id;
              return (
                <span key={d.id} className={`portal-disc-chip${active ? ' on' : ''}`}>
                  <i className="ti ti-discount-2" /> {discountLabel(d)} {tierHint(d)}
                </span>
              );
            })}
          </div>
        )}
        {showDiscounts && cl.discount > 0 && cl.tier ? (
          <span className="portal-prod-badge">
            <i className="ti ti-discount-2" />
            {cl.tier.discount_percentage !== null && cl.tier.discount_percentage > 0
              ? `خصم ${cl.tier.discount_percentage}%`
              : discountLabel(cl.tier)}
          </span>
        ) : null}
        {showIncartBadge && inCart && (
          <span className="portal-prod-incart">
            <i className="ti ti-check" /> في السلة
          </span>
        )}
        {outOfStock && (
          <div className="portal-prod-oos">
            <i className="ti ti-basket-off" /> نفد المخزون
          </div>
        )}
        <div className="portal-prod-add" onClick={(e) => e.stopPropagation()}>
          {outOfStock ? (
            <button
              className="portal-prod-fab portal-prod-fab--off"
              type="button"
              disabled
              aria-label="غير متوفر حالياً"
            >
              <i className="ti ti-basket-off" />
            </button>
          ) : inCart ? (
            <div className="portal-prod-qty">
              <button
                type="button"
                onClick={() => addToCart(p.id, cartQty - 1, selectedPack)}
                disabled={cartQty <= 1}
                aria-label="تقليل الكمية"
              >
                <i className="ti ti-minus" />
              </button>
              <input
                type="number"
                min={1}
                value={cartQty}
                onChange={(e) => {
                  const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  updateCartQty(key, n);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="الكمية"
              />
              <button
                type="button"
                onClick={() => addToCart(p.id, cartQty + 1, selectedPack)}
                aria-label="زيادة الكمية"
              >
                <i className="ti ti-plus" />
              </button>
            </div>
          ) : (
            <button
              className={`portal-prod-fab${!canOrder ? ' portal-prod-fab--off' : ''}`}
              type="button"
              onClick={() => addToCart(p.id, q, selectedPack)}
              disabled={!canOrder}
              aria-label="أضف إلى السلة"
            >
              <i className="ti ti-plus" />
              <span className="portal-prod-fab-txt">أضف إلى السلة</span>
            </button>
          )}
        </div>
      </div>

      <div className="portal-prod-body">
        <div className="portal-prod-name">{p.name}</div>
        {showRef && p.ref && <div className="portal-prod-ref">{p.ref}</div>}

        <div className="portal-prod-foot">
          {showPrice ? (
            <div className="portal-prod-price">
              {cl.discount > 0 && cl.tier ? (
                <>
                  <span className="portal-prod-price-now">
                    {fmtMoney(cl.unitPrice - cl.discount / Math.max(1, q))}
                  </span>
                  <span className="portal-prod-price-old">{fmtMoney(cl.unitPrice)}</span>
                </>
              ) : (
                <span className="portal-prod-price-now">{fmtMoney(cl.unitPrice)}</span>
              )}
              {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
            </div>
          ) : (
            <div className="portal-prod-price">
              {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
            </div>
          )}
          {showDiscounts && showPrice && cl.discount > 0 && cl.tier && (
            <span className="portal-prod-save">
              <i className="ti ti-discount-2" /> وفّر {fmtMoney(cl.discount)}
            </span>
          )}
          <div className="portal-prod-meta">
            {showTva &&
              (partyIsTvaExempt ? (
                <span className="portal-prod-exempt">
                  <i className="ti ti-shield-check" /> معفى من TVA
                </span>
              ) : p.tva_rate > 0 ? (
                <span className="portal-prod-tva">TVA {p.tva_rate}%</span>
              ) : null)}
            {showStock && p.manages_stock && p.current_stock !== null && (
              outOfStock ? (
                <span className="portal-prod-stock out">
                  <i className="ti ti-alert-circle" /> نفد المخزون
                </span>
              ) : lowStock ? (
                <span className="portal-prod-stock low">
                  <i className="ti ti-alert-triangle" /> كمية محدودة: {p.current_stock}
                </span>
              ) : (
                <span className="portal-prod-stock">
                  <i className="ti ti-check" /> متوفر: {p.current_stock}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {showPackaging && p.has_packaging && p.packagings.length > 0 && (
        <select
          className="portal-prod-pkg"
          value={selectedPack ?? ''}
          disabled={outOfStock || !canSwitchPack}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const val = e.target.value;
            setPkg((prev) => ({ ...prev, [p.id]: val === '' ? null : Number(val) }));
          }}
        >
          {p.packagings.map((pk) => (
            <option key={pk.id} value={pk.id}>
              {pk.label || pk.code || `×${pk.quantity}`}
              {showPrice ? ` — ${fmtMoney(pk.pack_price_ht)}` : ''}
            </option>
          ))}
        </select>
      )}
      {showPackaging && factor > 1 && !outOfStock && (
        <div className="portal-prod-packinfo">
          {cartQty} {selectedPack ? `×${factor}` : ''} = {cartQty * factor} {unitOf(p)}
        </div>
      )}
    </div>
  );
}
