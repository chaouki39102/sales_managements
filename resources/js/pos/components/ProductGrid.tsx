import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProductVariant, ProductPackaging, PriceLevel, CartItem } from '@/types';
import type { ViewMode, GridSize } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, isVariantOutOfStock } from '../utils/posHelpers';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';
import ProductCard from './ProductCard';

interface ProductGridProps {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  onAdd: (v: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
  allowNegativeStock?: boolean | undefined;
  showStock?: boolean;
  priceDisplayMode?: 'ttc' | 'ht';
  defaultPriceLevelId?: number | null;
  highlightedIndex?: number;
  onHighlightIndexChange?: (idx: number) => void;
  onQty?: (variantId: number, newQty: number) => void;
  searchQuery?: string;
  scannedId?: number | null;
}

type RowItem = { variant: ProductVariant; idx: number };

const MIN_CARD_WIDTH: Record<GridSize, number> = { xs: 100, sm: 130, md: 165, lg: 200 };
const ROW_ESTIMATE: Record<GridSize, number> = { xs: 150, sm: 195, md: 255, lg: 300 };
const MAX_COLS: Record<GridSize, number> = { xs: 8, sm: 6, md: 5, lg: 4 };
const GRID_GAP: Record<GridSize, number> = { xs: 6, sm: 8, md: 10, lg: 12 };

export default function ProductGrid({
  variants, view, gridSize, loading, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems, allowNegativeStock,
  showStock = true, priceDisplayMode = 'ttc', defaultPriceLevelId = null,
  highlightedIndex, onHighlightIndexChange, onQty,
  searchQuery = '', scannedId,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  const inCartUnits = useCallback((variantId: number) => {
    let units = 0;
    for (const i of cartItems) {
      if (i.variant_id === variantId) units += i.quantity * (i.pack_qty ?? 1);
    }
    return units;
  }, [cartItems]);

  const variantCountByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of variants) {
      const pid = v.product_id;
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return map;
  }, [variants]);

  // ── Grid view (virtualised) ──────────────────────────────────────────────
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useLayoutEffect(() => {
  if (view !== 'grid') return;
  const el = gridWrapRef.current;
  if (!el) return;
  const minW = MIN_CARD_WIDTH[gridSize];
  const calc = () => {
    const w = el.clientWidth;
    if (w <= 0) return;
    setColumns(Math.min(MAX_COLS[gridSize], Math.max(1, Math.floor(w / minW))));
  };
  calc();
  const obs = new ResizeObserver(calc);
  obs.observe(el);
  return () => obs.disconnect();
  }, [view, gridSize, loading]);

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
  const rowH = ROW_ESTIMATE[gridSize];

  // Virtualizer — estimateSize is only the *initial* guess; measureElement
  // (passed as a ref on each row below) makes react-virtual re-measure the
  // real rendered height of every row, so rows never overlap and never
  // leave oversized gaps, regardless of gridSize or content changes.
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowH,
    overscan: 3,
  });

  // Re-measure rows on size preset change (useLayoutEffect to avoid paint flash)
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [gridSize, columns, rowVirtualizer]);

  const prevHl = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlightedIndex === undefined || highlightedIndex === prevHl.current) return;
    prevHl.current = highlightedIndex;
    if (view === 'grid') {
      const rowIdx = Math.floor(highlightedIndex / columns);
      rowVirtualizer.scrollToIndex(rowIdx, { align: 'auto' });
    } else if (view === 'list') {
      listRef.current?.querySelector<HTMLElement>(`[data-hl-idx="${highlightedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }
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
        <div className="pos-empty-ico">
          <i className={`ti ${searchQuery ? 'ti-search' : 'ti-package-off'}`} />
        </div>
        <div className="pos-empty-ttl">{searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات'}</div>
        <div className="pos-empty-sub">
          {searchQuery
            ? <>لا توجد منتجات تطابق &quot;<strong>{searchQuery}</strong>&quot;</>
            : 'جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً'
          }
        </div>
        {!searchQuery && (
          <button className="btn btn-sm" onClick={onAddManual}>
            <i className="ti ti-plus" /> إضافة يدوية
          </button>
        )}
      </div>
    </div>
  );

  // ── List view (not virtualised — ~3 500 DOM nodes, acceptable) ──────────
  if (view === 'list') {
    return (
      <div className="pos-grid-area" ref={listRef}>
        <table className="pos-ptable">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الوحدة</th>
              {priceDisplayMode !== 'ht' && <th>السعر HT</th>}
              <th>TVA</th>
              <th>{priceDisplayMode === 'ht' ? 'السعر HT' : 'السعر TTC'}</th>
              {showStock && <th>مخزون</th>}
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
                    <div className="prow-name-inner">
                      {inCart > 0 && <span className="prow-incart-qty">{inCart}</span>}
                      <div className="prow-nm">{v.product?.name}</div>
                    </div>
                    {v.barcode && <div className="prow-bc">{v.barcode}</div>}
                  </td>
                  <td className="prow-unit">{v.unit?.abbreviation ?? '—'}</td>
                  {priceDisplayMode !== 'ht' && <td className="prow-price">{formatDZD(priceHt)}</td>}
                  <td className="prow-tva">{tvaRate}%</td>
                  <td className="prow-ttc">{formatDZD(priceDisplayMode === 'ht' ? priceHt : priceTtc)}</td>
                  {showStock && (
                    <td className="prow-stock">
                      {v.manages_stock && !unknownSt
                        ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : lastPiece ? 'last' : 'ok'}`}>{stockVal ?? 0}</span>
                        : <span className="stock-pill na">—</span>
                      }
                    </td>
                  )}
                  <td>
                    <div className="prow-acts">
                      {inCart > 0 && <span className="incart-badge">{inCart}</span>}
                      <FloatingTooltip content={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}>
                        <button className={`prow-pin${isPinned(v.id) ? ' on' : ''}`} onClick={e => { e.stopPropagation(); onPin(v); }}>
                          <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                        </button>
                      </FloatingTooltip>
                      <FloatingTooltip content="إضافة للسلة">
                        <button className="prow-add" onClick={() => !outStock && onAdd(v)}
                          disabled={outStock}>
                          <i className="ti ti-plus" />
                        </button>
                      </FloatingTooltip>
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
  const gap = GRID_GAP[gridSize];
  const colBasis = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;

  return (
    <div
      key={gridSize}
      className={`pos-grid-area pgrid ${gridMod}`}
      ref={scrollRef}
      style={{ overflow: 'auto', display: 'block' }}
    >
      <div ref={gridWrapRef} style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowData = rows[virtualRow.index];
          if (!rowData) return null;
          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
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
                <div
                  key={item.variant.id}
                  style={{ flex: `0 0 ${colBasis}`, maxWidth: colBasis, minWidth: 0 }}
                >
                  <ProductCard
                    variant={item.variant}
                    idx={item.idx}
                    qtyInCart={inCartQty(item.variant.id)}
                    qtyInCartUnits={inCartUnits(item.variant.id)}
                    highlighted={highlightedIndex === item.idx}
                    isPinned={isPinned(item.variant.id)}
                    priceLevels={priceLevels}
                    selectedPriceLevelId={selectedPriceLevelId}
                    defaultPriceLevelId={defaultPriceLevelId}
                    allowNegativeStock={allowNegativeStock}
                    showStock={showStock}
                    priceDisplayMode={priceDisplayMode}
                    onAdd={onAdd}
                    onPin={onPin}
                    onHighlight={onHighlightIndexChange}
                    onQty={onQty}
                    searchQuery={searchQuery}
                    scannedId={scannedId}
                    variantCount={variantCountByProduct.get(item.variant.product_id)}
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
