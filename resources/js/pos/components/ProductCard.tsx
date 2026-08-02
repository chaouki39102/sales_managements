import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ProductVariant, ProductPackaging, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';

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
  defaultPriceLevelId?:  number | null;
  onAdd:                 (v: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
  onPin:                 (v: ProductVariant) => void;
  onHighlight?:          (idx: number) => void;
  onQty?:                (variantId: number, newQty: number) => void;
  searchQuery?:          string;
  scannedId?:            number | null;
  variantCount?:         number;
  /** Base-unit quantity already in the cart for this variant (stock badge subtracts it) */
  qtyInCartUnits?:       number;
}

const TAP_THRESHOLD = 300;

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

function ProductCardInner({
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
  defaultPriceLevelId = null,
  onAdd,
  onPin,
  onHighlight,
  onQty,
  searchQuery = '',
  scannedId,
  variantCount,
  qtyInCartUnits = 0,
}: ProductCardProps) {
  const rawStock      = v.current_stock;
  const unknownStock  = rawStock === undefined;
  const available     = rawStock !== undefined ? Math.max(0, rawStock - qtyInCartUnits) : rawStock;
  const outStock      = isVariantOutOfStock(v, allowNegativeStock) || (v.manages_stock && !unknownStock && (available ?? 0) <= 0 && !allowNegativeStock && !v.allow_negative_stock);
  const negStock      = v.manages_stock && !unknownStock && (rawStock ?? 0) < 0;
  const lowStock      = v.manages_stock && !unknownStock && !negStock && (available ?? 0) > 0 && (available ?? 0) <= (v.min_stock_alert ?? 0);
  const lastPiece     = v.manages_stock && !unknownStock && !negStock && (available ?? 0) > 0 && (available ?? 0) <= 2 && !lowStock;

  const bestDiscount = useMemo(() => {
    const d = v.quantity_discounts?.filter(d => d.active !== false)
      .sort((a, b) => {
        const aPct = a.discount_percentage ?? (a.discount_amount && a.discount_amount > 0 ? 1 : 0);
        const bPct = b.discount_percentage ?? (b.discount_amount && b.discount_amount > 0 ? 1 : 0);
        return bPct - aPct;
      })[0];
    if (!d) return null;
    const hasPct = (d.discount_percentage ?? 0) > 0;
    const hasAmt = (d.discount_amount ?? 0) > 0;
    return (hasPct || hasAmt) ? d : null;
  }, [v.quantity_discounts]);

  const isWholesalePrice = selectedPriceLevelId != null &&
    selectedPriceLevelId !== (defaultPriceLevelId ?? priceLevels[0]?.id ?? null);

  const style = familyStyleFromName(v.product?.family?.name ?? '');
  const imageUrl = v.image_url;

  // ── Packaging ──────────────────────────────────────────────────────────────
  const packagings = useMemo(() => {
    const raw = v.packagings ?? (v.product as any)?.packagings;
    if (!raw?.length) return [] as ProductPackaging[];
    return raw.filter((p: ProductPackaging) => p.active !== false)
      .sort((a: ProductPackaging, b: ProductPackaging) => a.display_order - b.display_order);
  }, [v.packagings, v.product]);

  const defaultPkg = useMemo(
    () => packagings.find((p: any) => p.is_default) ?? packagings[0] ?? null,
    [packagings],
  );
  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(null);

  useEffect(() => { setSelectedPkgId(defaultPkg?.id ?? null); }, [defaultPkg?.id]);

  const activePkg  = packagings.find((p: any) => p.id === selectedPkgId) ?? defaultPkg;
  const packQty    = activePkg ? Math.max(1, Number(activePkg.quantity) || 1) : 1;
  const showPkgSel = packagings.length > 1;

  const priceHtBase = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const priceHt  = priceHtBase * packQty;
  const tvaRate  = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);

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

  useEffect(() => {
    return () => {
      if (addTimerRef.current) clearTimeout(addTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  const lastTapRef = useRef(0);
  const handleAdd = useCallback((qty?: number) => {
    if (outStock) return;
    onAdd(v, qty, activePkg);
    setJustAdded(true);
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    addTimerRef.current = setTimeout(() => setJustAdded(false), 450);
  }, [outStock, onAdd, v, activePkg]);

  const handleClick = useCallback(() => {
    if (outStock) { onHighlight?.(idx); return; }
    const now = Date.now();
    if (now - lastTapRef.current < TAP_THRESHOLD) {
      handleAdd(2);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      handleAdd(1);
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

  const handleAddBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleAdd(1);
  }, [handleAdd]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPin(v);
  }, [onPin, v]);

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
          ? <img src={imageUrl ?? undefined} alt={v.product?.name} loading="lazy" onLoad={() => setImgLoaded(true)} onError={() => setImgFailed(true)} />
          : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
        }

        <div className="pcard-family-bar" style={{ background: style.color }} />

        {bestDiscount && <span className="pcard-discount-badge">
          {bestDiscount.discount_percentage != null && bestDiscount.discount_percentage > 0
            ? `-${bestDiscount.discount_percentage}%`
            : bestDiscount.discount_amount != null && bestDiscount.discount_amount > 0
              ? `-${formatDZD(bestDiscount.discount_amount)}`
              : null}
        </span>}
        {isWholesalePrice && <span className="pcard-price-level-badge">جملة</span>}
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
            {outStock ? '0' : available}{v.unit?.abbreviation ? ` ${v.unit.abbreviation}` : ''}
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
              {tvaRate > 0 && <span className="pcard-ht">HT: {formatDZD(priceHtBase)}</span>}
            </>
          )}
        </div>

        {showPkgSel && (
          <div className="pcard-pkg" onClick={e => e.stopPropagation()}>
            <select
              className="pcard-pkg-select"
              value={activePkg?.id ?? ''}
              onChange={e => {
                const id = Number(e.target.value);
                setSelectedPkgId(id);
              }}
            >
              {packagings.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.label}{p.quantity > 1 ? ` (${p.quantity})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pcard-actions">
        <FloatingTooltip content={isPinned ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}>
          <button
            className={`pcard-pin ${isPinned ? 'on' : ''}`}
            onClick={handlePin}
          >
            <i className={`ti ti-star${isPinned ? '-filled' : ''}`} />
          </button>
        </FloatingTooltip>

        {inCart && onQty ? (
          <div className="pcard-qty-ctrl">
            <FloatingTooltip content="تقليل">
              <button className="pcard-qty-btn" onClick={handleDec}>
                <i className="ti ti-minus" />
              </button>
            </FloatingTooltip>
            <span className="pcard-qty-val" key={qtyInCart}>{qtyInCart}</span>
            <FloatingTooltip content="زيادة">
              <button className="pcard-qty-btn pcard-qty-inc" onClick={handleInc} disabled={outStock}>
                <i className="ti ti-plus" />
              </button>
            </FloatingTooltip>
          </div>
        ) : (
          <FloatingTooltip content="إضافة للسلة">
            <button
              className="pcard-add"
              onClick={handleAddBtn}
              disabled={outStock}
            >
              <i className={`ti ${justAdded ? 'ti-check' : 'ti-plus'}`} />
            </button>
          </FloatingTooltip>
        )}
      </div>

      {showInfo && (
        <div className="pcard-info-popover">
          <div className="pcard-info-row"><span className="pcard-info-label">المراجع:</span> {v.ref}</div>
          {v.barcode && <div className="pcard-info-row"><span className="pcard-info-label">الباركود:</span> {v.barcode}</div>}
          {v.product?.family?.name && <div className="pcard-info-row"><span className="pcard-info-label">العائلة:</span> {v.product.family.name}</div>}
          {bestDiscount && <div className="pcard-info-row"><span className="pcard-info-label">الخصم:</span> <span style={{color:'var(--red)'}}>
            {bestDiscount.discount_percentage != null && bestDiscount.discount_percentage > 0
              ? `${bestDiscount.discount_percentage}%`
              : bestDiscount.discount_amount != null && bestDiscount.discount_amount > 0
                ? `${formatDZD(bestDiscount.discount_amount)}/وحدة`
                : ''}
          </span></div>}
          {v.product?.description && <div className="pcard-info-row pcard-info-desc">{v.product.description}</div>}
        </div>
      )}
    </div>
  );
}

const ProductCard = React.memo(ProductCardInner, (prev, next) => {
  return prev.variant.id === next.variant.id
    && prev.idx === next.idx
    && prev.qtyInCart === next.qtyInCart
    && prev.qtyInCartUnits === next.qtyInCartUnits
    && prev.highlighted === next.highlighted
    && prev.isPinned === next.isPinned
    && prev.selectedPriceLevelId === next.selectedPriceLevelId
    && prev.allowNegativeStock === next.allowNegativeStock
    && prev.showStock === next.showStock
    && prev.priceDisplayMode === next.priceDisplayMode
    && prev.searchQuery === next.searchQuery
    && prev.scannedId === next.scannedId
    && prev.variantCount === next.variantCount
    && prev.priceLevels === next.priceLevels
    && prev.onAdd === next.onAdd
    && prev.onPin === next.onPin
    && prev.onHighlight === next.onHighlight
    && prev.onQty === next.onQty;
});

export default ProductCard;
