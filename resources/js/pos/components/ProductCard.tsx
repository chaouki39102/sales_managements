import React, { useState, useCallback, useRef } from 'react';
import type { ProductVariant, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';

interface ProductCardProps {
  variant:               ProductVariant;
  idx:                   number;
  qtyInCart:             number;
  highlighted:           boolean;
  isPinned:              boolean;
  priceLevels:           PriceLevel[];
  selectedPriceLevelId:  number | null;
  allowNegativeStock?:   boolean;
  showStock?:            boolean;
  priceDisplayMode?:     'ttc' | 'ht';
  onAdd:                 (v: ProductVariant) => void;
  onPin:                 (v: ProductVariant) => void;
  onHighlight?:          (idx: number) => void;
  onQty?:                (variantId: number, newQty: number) => void;
}

export default function ProductCard({
  variant: v,
  idx,
  qtyInCart,
  highlighted,
  isPinned,
  priceLevels,
  selectedPriceLevelId,
  allowNegativeStock,
  showStock = true,
  priceDisplayMode = 'ttc',
  onAdd,
  onPin,
  onHighlight,
  onQty,
}: ProductCardProps) {
  const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const tvaRate  = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);

  const rawStock      = v.current_stock;
  const stock         = rawStock !== undefined ? Math.max(0, rawStock) : rawStock;
  const unknownStock  = rawStock === undefined;
  const outStock      = isVariantOutOfStock(v, allowNegativeStock);
  const negStock      = v.manages_stock && !unknownStock && (rawStock ?? 0) < 0;
  const lowStock      = v.manages_stock && !unknownStock && !negStock && (stock ?? 0) > 0 && (stock ?? 0) <= (v.min_stock_alert ?? 0);
  const lastPiece     = v.manages_stock && !unknownStock && !negStock && (stock ?? 0) > 0 && (stock ?? 0) <= 2 && !lowStock;

  const style = familyStyleFromName(v.product?.family?.name ?? '');
  const imageUrl = (v as unknown as { image_url?: string }).image_url;

  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;

  const [justAdded, setJustAdded] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdd = useCallback(() => {
    if (outStock) return;
    onAdd(v);
    setJustAdded(true);
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    addTimerRef.current = setTimeout(() => setJustAdded(false), 450);
  }, [outStock, onAdd, v]);

  const handleClick = useCallback(() => {
    if (!outStock) {
      handleAdd();
    } else {
      onHighlight?.(idx);
    }
  }, [outStock, handleAdd, onHighlight, idx]);

  const handleInc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQty?.(v.id, qtyInCart + 1);
  }, [onQty, v.id, qtyInCart]);

  const handleDec = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (qtyInCart > 1) onQty?.(v.id, qtyInCart - 1);
    else onQty?.(v.id, 0);
  }, [onQty, v.id, qtyInCart]);

  const inCart = qtyInCart > 0;

  return (
    <div
      data-hl-idx={idx}
      className={[
        'pcard',
        outStock && 'pcard-out',
        inCart && 'pcard-incart',
        highlighted && 'pcard-hl',
        isPinned && 'pcard-pinned',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      title={v.product?.name}
    >
      <div className={`pcard-img ${showImage && !imgLoaded ? 'pcard-img-loading' : ''}`} style={!showImage ? { background: style.bg } : undefined}>
        {showImage
          ? <img src={imageUrl} alt={v.product?.name} loading="lazy" onLoad={() => setImgLoaded(true)} onError={() => setImgFailed(true)} />
          : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
        }

        <div className="pcard-family-bar" style={{ background: style.color }} />

        {inCart && <span className="pcard-in-cart" key={qtyInCart}>{qtyInCart}</span>}
        {outStock && <span className="pcard-out-badge">نفذ</span>}
        {negStock && !outStock && <span className="pcard-neg-badge">سالب</span>}
        {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
        {lastPiece && <span className="pcard-last-badge">آخر قطعة</span>}
        {showStock && v.manages_stock && !unknownStock && (
          <span className={`pcard-stock-badge ${outStock ? 'out' : lowStock ? 'low' : negStock ? 'neg' : 'ok'}`}>
            {outStock ? '0' : stock}{v.unit?.abbreviation ? ` ${v.unit.abbreviation}` : ''}
          </span>
        )}
        {showStock && v.manages_stock && unknownStock && (
          <span className="pcard-stock-badge na">—</span>
        )}
      </div>

      <div className="pcard-body">
        <div className="pcard-name">{v.product?.name}</div>
        {v.barcode && <div className="pcard-bc">{v.barcode}</div>}

        <div className="pcard-prices">
          {priceDisplayMode === 'ht' ? (
            <span className="pcard-ttc">{formatDZD(priceHt)}</span>
          ) : (
            <>
              <span className="pcard-ttc">{formatDZD(priceTtc)}</span>
              {tvaRate > 0 && <span className="pcard-ht">HT: {formatDZD(priceHt)}</span>}
            </>
          )}
        </div>
      </div>

      <div className="pcard-actions" onClick={e => e.stopPropagation()}>
        <button
          className={`pcard-pin ${isPinned ? 'on' : ''}`}
          onClick={() => onPin(v)}
          title={isPinned ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <i className={`ti ti-star${isPinned ? '-filled' : ''}`} />
        </button>

        {inCart && onQty ? (
          <div className="pcard-qty-ctrl">
            <button className="pcard-qty-btn" onClick={handleDec} title="تقليل">
              <i className="ti ti-minus" />
            </button>
            <span className="pcard-qty-val" key={qtyInCart}>{qtyInCart}</span>
            <button className="pcard-qty-btn pcard-qty-inc" onClick={handleInc} title="زيادة" disabled={outStock}>
              <i className="ti ti-plus" />
            </button>
          </div>
        ) : (
          <button
            className="pcard-add"
            onClick={handleAdd}
            disabled={outStock}
            title="إضافة للسلة"
          >
            <i className={`ti ${justAdded ? 'ti-check' : 'ti-plus'}`} />
          </button>
        )}
      </div>
    </div>
  );
}
