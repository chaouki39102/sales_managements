import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProductVariant, PriceLevel, CartItem } from '@/types';
import type { ViewMode, GridSize } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';
import ProductCard from './ProductCard';

interface ProductGridProps {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  onAdd: (v: ProductVariant) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
  allowNegativeStock?: boolean | undefined;
  highlightedIndex?: number;
  onHighlightIndexChange?: (idx: number) => void;
}

/** أقل عرض للبطاقة حسب حجم الشبكة */
function minCardWidth(gridSize: GridSize): number {
  switch (gridSize) {
    case 'xs': return 100;
    case 'sm': return 130;
    case 'md': return 165;
    case 'lg': return 200;
  }
}

/** ارتفاع الصف التقريبي حسب حجم الشبكة */
function rowEstimate(gridSize: GridSize): number {
  switch (gridSize) {
    case 'xs': return 110;
    case 'sm': return 150;
    case 'md': return 190;
    case 'lg': return 240;
  }
}

export default function ProductGrid({
  variants, view, gridSize, loading, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems, allowNegativeStock,
  highlightedIndex, onHighlightIndexChange,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  // ── Grid view (virtualised) ──────────────────────────────────────────────
  // Column calculation: keep cards between min‑width and max comfortable cols
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const MAX_COLS: Record<GridSize, number> = { xs: 8, sm: 6, md: 5, lg: 4 };

  useEffect(() => {
    if (view !== 'grid') return;
    const el = gridWrapRef.current;
    if (!el) return;
    const minW = minCardWidth(gridSize);
    const calc = () => {
      const w = el.clientWidth;
      setColumns(Math.min(MAX_COLS[gridSize], Math.max(1, Math.floor(w / minW))));
    };
    calc();
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    return () => obs.disconnect();
  }, [view, gridSize]);

  // Group into rows (keep original index for keyboard nav)
  type RowItem = { variant: ProductVariant; idx: number };
  const rows = useMemo(() => {
    if (view !== 'grid' || columns < 1) return [] as RowItem[][];
    const r: RowItem[][] = [];
    for (let i = 0; i < variants.length; i += columns) {
      const row: RowItem[] = [];
      for (let j = 0; j < columns && i + j < variants.length; j++) {
        row.push({ variant: variants[i + j], idx: i + j });
      }
      r.push(row);
    }
    return r;
  }, [variants, columns, view]);

  const rowCount = rows.length;
  const rowH = rowEstimate(gridSize);

  // Virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowH,
    overscan: 3,
  });

  // Keyboard navigation scroll sync
  const prevHl = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (view !== 'grid') return;
    if (highlightedIndex === undefined || highlightedIndex === prevHl.current) return;
    prevHl.current = highlightedIndex;
    const rowIdx = Math.floor(highlightedIndex / columns);
    rowVirtualizer.scrollToIndex(rowIdx, { align: 'nearest' });
  }, [highlightedIndex, columns, view, rowVirtualizer]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="pos-grid-area">
      <div className="pos-loading">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="pos-skel" style={{ animationDelay: `${i * 0.04}s` }} />
        ))}
      </div>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!variants.length) return (
    <div className="pos-grid-area">
      <div className="pos-empty">
        <div className="pos-empty-ico"><i className="ti ti-package-off" /></div>
        <div className="pos-empty-ttl">لا توجد منتجات</div>
        <div className="pos-empty-sub">جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً</div>
        <button className="btn btn-sm" onClick={onAddManual}>
          <i className="ti ti-plus" /> إضافة يدوية
        </button>
      </div>
    </div>
  );

  // ── List view (not virtualised — ~3 500 DOM nodes, acceptable) ──────────
  if (view === 'list') {
    return (
      <div className="pos-grid-area">
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
            {variants.map((v, idx) => {
              const priceHt   = getVariantPrice(v, selectedPriceLevelId, priceLevels);
              const tvaRate   = v.tva?.rate ?? 19;
              const priceTtc  = priceHt * (1 + tvaRate / 100);
              const inCart    = inCartQty(v.id);
              const stockVal  = v.current_stock;
              const unknownSt = stockVal === undefined;
              const outStock  = isVariantOutOfStock(v, allowNegativeStock);
              const lowStock  = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= (v.min_stock_alert ?? 0);
              const lastPiece = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= 2 && !lowStock;
              return (
                <tr
                  key={v.id}
                  data-hl-idx={idx}
                  className={`prow ${outStock ? 'prow-out' : ''} ${inCart > 0 ? 'prow-incart' : ''} ${highlightedIndex === idx ? 'prow-hl' : ''}`}
                  onClick={() => onHighlightIndexChange?.(idx)}
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
                    {v.manages_stock && !unknownSt
                      ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : lastPiece ? 'last' : 'ok'}`}>{stockVal ?? 0}</span>
                      : <span className="stock-pill na">—</span>
                    }
                  </td>
                  <td>
                    <div className="prow-acts">
                      {inCart > 0 && <span className="incart-badge">{inCart}</span>}
                      <button className="prow-pin" onClick={e => { e.stopPropagation(); onPin(v); }}
                        title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}>
                        <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                      </button>
                      <button className="prow-add" onClick={() => !outStock && onAdd(v)}
                        disabled={outStock} title="إضافة للسلة (دبل كليك)">
                        <i className="ti ti-plus" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Grid view (virtualised) ──────────────────────────────────────────────
  const gridMod = gridSize === 'xs' ? 'pgrid--xs' : gridSize === 'sm' ? 'pgrid--sm' : gridSize === 'lg' ? 'pgrid--lg' : '';
  const gap = gridSize === 'xs' ? 6 : gridSize === 'sm' ? 8 : gridSize === 'md' ? 10 : 12;

  return (
    <div className={`pos-grid-area ${gridMod}`} ref={scrollRef} style={{ overflow: 'auto' }}>
      <div ref={gridWrapRef} style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowData = rows[virtualRow.index];
          if (!rowData) return null;
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                gap,
                padding: gap,
                direction: 'rtl',
              }}
            >
              {rowData.map(item => (
                <div key={item.variant.id} style={{ flex: '1 1 0', minWidth: 0 }}>
                  <ProductCard
                    variant={item.variant}
                    idx={item.idx}
                    qtyInCart={inCartQty(item.variant.id)}
                    highlighted={highlightedIndex === item.idx}
                    isPinned={isPinned(item.variant.id)}
                    priceLevels={priceLevels}
                    selectedPriceLevelId={selectedPriceLevelId}
                    allowNegativeStock={allowNegativeStock}
                    onAdd={onAdd}
                    onPin={onPin}
                    onHighlight={onHighlightIndexChange}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
