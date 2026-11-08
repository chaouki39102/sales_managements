// pages/portal/orders/components/ProductImageLightbox.tsx
// Full-screen product image preview.
import { proxyImage } from '@/lib/api/imageProxy';
import { fmtMoney } from '../../portalUtils';
import { unitPriceFor, unitLabelFor } from '../catalogPricing';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';

export default function ProductImageLightbox(props: Omit<PortalOrdersState, 'infoProductId'> & { infoProductId: number }) {
  const {
    pkg, infoProductId, setPimZoom, showPrice, showUnit, byId,
  } = props;

  const p = byId.get(infoProductId)!;
  return (
    <div className="portal-pim-lb" role="dialog" aria-modal="true" aria-label={`معاينة صورة ${p.name}`}>
      <div className="portal-pim-lb-backdrop" onClick={() => setPimZoom(false)} />
      <button className="portal-pim-lb-x" type="button" onClick={() => setPimZoom(false)} aria-label="إغلاق المعاينة">
        <i className="ti ti-x" />
      </button>
      <figure className="portal-pim-lb-fig">
        {p.image ? (
          <img src={proxyImage(p.image, 1400) ?? p.image} alt={p.name} />
        ) : (
          <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
        )}
        <figcaption className="portal-pim-lb-cap">
          <b>{p.name}</b>
          {showPrice && (
            <span>
              {fmtMoney(unitPriceFor(p, pkg[p.id] ?? null))}
              {showUnit && `/${unitLabelFor(p, pkg[p.id] ?? null)}`}
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
