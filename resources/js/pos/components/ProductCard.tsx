import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  searchQuery?:          string;
  scannedId?:            number | null;
  variantCount?:         number;
}

function highlightText(text: string, query: string): React.ReactNode[] {
  if (!query || query.length < 2) return [text];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let idx = lower.indexOf(q, lastIdx);
  let key = 0;
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(<mark key={key++} className="pcard-hl-text">{text.slice(idx, idx + query.length)}</mark>);
    lastIdx = idx + query.length;
    idx = lower.indexOf(q, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : [text];
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
  searchQuery = '',
  scannedId,
  variantCount,
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

  const [flashing, setFlashing] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (scannedId && scannedId === v.id) {
      setFlashing(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashing(false), 1200);
    }
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, [scannedId, v.id]);

  const [showInfo, setShowInfo] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStarted = useRef(false);
  const handlePointerDown = useCallback(() => {
    pressStarted.current = true;
    pressTimerRef.current = setTimeout(() => {
      if (pressStarted.current) setShowInfo(true);
    }, 500);
  }, []);
  const handlePointerUp = useCallback(() => {
    pressStarted.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);
  useEffect(() => {
    if (showInfo) {
      const close = () => setShowInfo(false);
      window.addEventListener('pointerdown', close);
      return () => window.removeEventListener('pointerdown', close);
    }
  }, [showInfo]);

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
        flashing && 'pcard-flash',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
        {variantCount != null && variantCount > 1 && (
          <span className="pcard-variant-badge">{variantCount} خيارات</span>
        )}
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
        <div className="pcard-name">
          {searchQuery ? highlightText(v.product?.name ?? '', searchQuery) : v.product?.name}
        </div>
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

      {showInfo && (
        <div className="pcard-info-popover" onClick={e => e.stopPropagation()}>
          <div className="pcard-info-row"><span className="pcard-info-label">المراجع:</span> {v.ref}</div>
          {v.barcode && <div className="pcard-info-row"><span className="pcard-info-label">الباركود:</span> {v.barcode}</div>}
          {v.product?.family?.name && <div className="pcard-info-row"><span className="pcard-info-label">العائلة:</span> {v.product.family.name}</div>}
          {v.product?.description && <div className="pcard-info-row pcard-info-desc">{v.product.description}</div>}
        </div>
      )}
    </div>
  );
}
