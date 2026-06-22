import React, { useCallback } from 'react';
import type { ProductVariant, PriceLevel, CartItem } from '@/types';
import type { ViewMode, GridSize } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName } from '../utils/posHelpers';

interface ProductGridProps {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAdd: (v: ProductVariant) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
}

function LoadMore({ hasMore, loading, onLoadMore }: { hasMore?: boolean; loading: boolean; onLoadMore?: () => void }) {
  if (!hasMore) return null;
  return (
    <div className="pos-load-more">
      <button className="btn btn-outline" onClick={onLoadMore} disabled={loading}>
        {loading ? 'جاري التحميل…' : 'تحميل المزيد'}
      </button>
    </div>
  );
}

export default function ProductGrid({
  variants, view, gridSize, loading, hasMore, onLoadMore, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  if (loading) return (
    <div className="pos-loading">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="pos-skel" style={{ animationDelay: `${i * 0.04}s` }} />
      ))}
    </div>
  );

  if (!variants.length) return (
    <div className="pos-empty">
      <div className="pos-empty-ico"><i className="ti ti-package-off" /></div>
      <div className="pos-empty-ttl">لا توجد منتجات</div>
      <div className="pos-empty-sub">جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً</div>
      <button className="btn btn-sm" onClick={onAddManual}>
        <i className="ti ti-plus" /> إضافة يدوية
      </button>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="pos-list-wrap">
        <table className="pos-ptable">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الوحدة</th>
              <th>السعر HT</th>
              <th>TVA</th>
              <th>السعر TTC</th>
              <th>مخزون</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variants.map(v => {
              const priceHt   = getVariantPrice(v, selectedPriceLevelId, priceLevels);
              const tvaRate   = v.tva?.rate ?? 19;
              const priceTtc  = priceHt * (1 + tvaRate / 100);
              const inCart    = inCartQty(v.id);
              const lowStock  = v.manages_stock && (v.current_stock ?? 0) > 0 && (v.current_stock ?? 0) <= (v.min_stock_alert ?? 0);
              const outStock  = v.manages_stock && (v.current_stock ?? 0) <= 0;
              return (
                <tr
                  key={v.id}
                  className={`prow ${outStock ? 'prow-out' : ''} ${inCart > 0 ? 'prow-incart' : ''}`}
                  onDoubleClick={() => !outStock && onAdd(v)}
                >
                  <td className="prow-name">
                    <div className="prow-nm">{v.product?.name}</div>
                    {v.barcode && <div className="prow-bc">{v.barcode}</div>}
                  </td>
                  <td className="prow-unit">{v.unit?.abbreviation ?? '—'}</td>
                  <td className="prow-price">{formatDZD(priceHt)}</td>
                  <td className="prow-tva">{tvaRate}%</td>
                  <td className="prow-ttc">{formatDZD(priceTtc)}</td>
                  <td className="prow-stock">
                    {v.manages_stock
                      ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>{v.current_stock ?? 0}</span>
                      : <span className="stock-pill na">—</span>
                    }
                  </td>
                  <td>
                    <div className="prow-acts">
                      {inCart > 0 && <span className="incart-badge">{inCart}</span>}
                      <button
                        className="prow-pin"
                        onClick={e => { e.stopPropagation(); onPin(v); }}
                        title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                      </button>
                      <button
                        className="prow-add"
                        onClick={() => !outStock && onAdd(v)}
                        disabled={outStock && !v.allow_negative_stock}
                        title="إضافة للسلة (دبل كليك)"
                      >
                        <i className="ti ti-plus" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <LoadMore hasMore={hasMore} loading={loading} onLoadMore={onLoadMore} />
      </div>
    );
  }

  const colsMap: Record<GridSize, string> = {
    xs: 'pgrid--xs',
    sm: 'pgrid--sm',
    md: '',
    lg: 'pgrid--lg',
  };

  return (
    <>
      <div className={`pgrid ${colsMap[gridSize]}`}>
        {variants.map(v => {
          const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
          const tvaRate  = v.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);
          const inCart   = inCartQty(v.id);
          const stock    = v.current_stock ?? 0;
          const outStock = v.manages_stock && stock <= 0 && !v.allow_negative_stock;
          const lowStock = v.manages_stock && stock > 0 && stock <= (v.min_stock_alert ?? 0);

          const style = familyStyleFromName(v.product?.family?.name ?? '');

          return (
            <div
              key={v.id}
              className={`pcard ${outStock ? 'pcard-out' : ''} ${inCart > 0 ? 'pcard-incart' : ''}`}
              onClick={() => !outStock && onAdd(v)}
              title={v.product?.name}
            >
              <div className="pcard-img" style={{ background: style.bg }}>
                {(v as unknown as { image_url?: string }).image_url
                  ? <img src={(v as unknown as { image_url?: string }).image_url} alt={v.product?.name} />
                  : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
                }
                {inCart > 0 && <span className="pcard-in-cart">{inCart}</span>}
                {outStock && <span className="pcard-out-badge">نفذ</span>}
                {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
              </div>

              <div className="pcard-body">
                <div className="pcard-name">{v.product?.name}</div>
                {v.barcode && <div className="pcard-bc">{v.barcode}</div>}

                <div className="pcard-prices">
                  <span className="pcard-ttc">{formatDZD(priceTtc)}</span>
                  {tvaRate > 0 && (
                    <span className="pcard-ht">HT: {formatDZD(priceHt)}</span>
                  )}
                </div>

                {v.manages_stock && (
                  <div className={`pcard-stock ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>
                    <i className={`ti ti-${outStock ? 'alert-circle' : lowStock ? 'alert-triangle' : 'package'}`} />
                    {outStock ? 'نفذ المخزون' : `${stock} ${v.unit?.abbreviation ?? ''}`}
                  </div>
                )}
              </div>

              <div className="pcard-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`pcard-pin ${isPinned(v.id) ? 'on' : ''}`}
                  onClick={() => onPin(v)}
                  title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                >
                  <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                </button>
                <button
                  className="pcard-add"
                  onClick={() => !outStock && onAdd(v)}
                  disabled={outStock}
                  title="إضافة للسلة"
                >
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <LoadMore hasMore={hasMore} loading={loading} onLoadMore={onLoadMore} />
    </>
  );
}
