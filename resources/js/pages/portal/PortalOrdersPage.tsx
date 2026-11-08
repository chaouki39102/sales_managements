// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersPage.tsx — وصل طلب سلعة (كتالوج + سلة + طلباتي)
// ════════════════════════════════════════════════════════════════════════════
import { Link } from 'react-router-dom';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import OrderPipeline from './OrderPipeline';
import { fmtMoney, buildWhatsAppLink, waOrderMessage } from './portalUtils';
import { usePortalOrdersState } from './orders/hooks/usePortalOrdersState';
import CatalogSection from './orders/components/CatalogSection';
import ProductInfoModal from './orders/components/ProductInfoModal';
import ProductImageLightbox from './orders/components/ProductImageLightbox';
import CartDrawer from './orders/components/CartDrawer';

export default function PortalOrdersPage({ mode = 'portal' }: { mode?: 'portal' | 'public' } = {}) {
  const state = usePortalOrdersState(mode);
  const {
    slug, isPublic, toast, submitted, drawerOpen, setDrawerOpen, setCheckoutStep,
    infoProductId, pimZoom, confirmDialogProps, confirmationMessage, showPrice, companyQuery,
    createOrder, byId, cartEntries, totals,
  } = state;

  return (
    <section className={cartEntries.length > 0 ? 'portal-order-has-cart' : undefined}>
      <div className="portal-order-main">
          {/* ─── كتالوج المنتجات ─── */}
          <CatalogSection {...state} />

          {/* ─── تأكيد إرسال الطلب العام ─── */}
          {isPublic && submitted && createOrder.data && (
            <div className="portal-card portal-mt-16">
          <div className="portal-submit-ok">
            <div className="portal-celebrate-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path className="pcc-check" d="M5 13l4 4L19 7" /></svg>
            </div>
            <b>تم إرسال طلبك بنجاح</b>
            <div>
              رقم طلبك:{' '}
              <span className="portal-submit-ref">{createOrder.data.reference}</span>
            </div>
            {confirmationMessage && (
              <div className="portal-submit-msg">{confirmationMessage}</div>
            )}
            <OrderPipeline status={createOrder.data.status} />
            {companyQuery.data?.phone && (() => {
              const wa = buildWhatsAppLink(companyQuery.data?.phone, waOrderMessage(createOrder.data));
              return wa ? (
                <div className="portal-order-actions" style={{ justifyContent: 'center' }}>
                  <a
                    className="portal-btn portal-btn--sm portal-btn--wa"
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ti ti-brand-whatsapp" /> مراسلة عبر واتساب
                  </a>
                </div>
              ) : null;
            })()}
            <div className="portal-submit-hint">
              يمكنك متابعة حالة طلبك لاحقاً من صفحة{' '}
              <Link to={`/portal/${slug}/track`}>تتبع طلبك</Link> برقم هاتفك
              {createOrder.data.notes ? <> — ملاحظتك مسجّلة: «{createOrder.data.notes}»</> : null}
            </div>
          </div>
          </div>
        )}
        </div>

      {/* ─── نافذة تفاصيل المنتج (صورة + خصم + تعبئة + كل المعلومات) ─── */}
      {infoProductId !== null && byId.has(infoProductId) && (
        <ProductInfoModal {...state} infoProductId={infoProductId} />
      )}

      {/* ─── Lightbox — صورة المنتج بملء الشاشة ─── */}
      {pimZoom && infoProductId !== null && byId.has(infoProductId) && (
        <ProductImageLightbox {...state} infoProductId={infoProductId} />
      )}

      {/* ─── سلة الطلب — درج جانبي منزلق كتصاميم المتاجر ─── */}
      {drawerOpen && (
        <CartDrawer {...state} />
      )}

      {cartEntries.length > 0 && (
        <button className="portal-mobile-cart-bar" onClick={() => { setCheckoutStep(false); setDrawerOpen(true); }} type="button">
          <i className="ti ti-basket" />
          <span>{cartEntries.length} صنف</span>
          {showPrice && <b>{fmtMoney(totals.ttc)}</b>}
          <span className="portal-mobile-cart-bar-go"><i className="ti ti-shopping-cart" /> عرض السلة</span>
        </button>
      )}

      {/* ─── نهاية قسم الطلبات — انتقل إلى صفحة طلباتي المستقلة PortalMyOrdersPage ─── */}

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}
