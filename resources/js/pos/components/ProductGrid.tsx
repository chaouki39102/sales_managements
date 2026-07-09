import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
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

/** ارتفاع الصف التقريبي حسب حجم الشبكة — تقدير أوّلي فقط قبل القياس
 *  الفعلي؛ الارتفاع الحقيقي يُقاس ديناميكياً عبر measureElement أدناه
 *  فلا داعي لمطابقته بدقة (يمنع التداخل/الفراغات الزائدة عند تبديل
 *  الحجم s/m/l/xl). */
function rowEstimate(gridSize: GridSize): number {
  switch (gridSize) {
    case 'xs': return 150;
    case 'sm': return 195;
    case 'md': return 255;
    case 'lg': return 300;
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

  // نفس منطق useLayoutEffect أعلاه: نحسب عدد الأعمدة الأولي للحجم
  // الجديد *قبل* الرسم لتفادي أي فلاش عند تبديل S/M/L/XL. تحديثات
  // ResizeObserver اللاحقة (أثناء تغيير حجم النافذة الفعلي) تبقى غير
  // متزامنة بطبيعتها من المتصفح، وهذا مقبول لأنها حالة مختلفة (تغيير
  // حجم النافذة، وليس تبديل نمط العرض).
  useLayoutEffect(() => {
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

  // Re-measure everything whenever the size preset changes (image height,
  // paddings, font sizes all change with gridSize) so stale measurements
  // from a previous size never leak into the new layout.
  // useLayoutEffect (وليس useEffect) عمداً: لازم نعيد القياس *قبل* ما
  // يرسم المتصفح الإطار (paint)، وإلا يشوف المستخدم لحظة (frame واحد
  // أو أكثر) بارتفاعات صفوف قديمة/متراكبة قبل ما تتصحح — وهذا بالضبط
  // كان سبب "الفلاش" اللي يبان كخطأ حتى لو يتصحح لحاله بعدين.
  // useLayoutEffect يشتغل بشكل متزامن (synchronous) بعد تحديث DOM
  // مباشرة وقبل الرسم، فالمستخدم ما يشوف إلا الحالة الصحيحة النهائية.
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [gridSize, columns, rowVirtualizer]);

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

  // عرض ثابت وموحّد لكل بطاقة = (100% - مسافات) / عدد الأعمدة.
  // هذا يمنع تمدّد البطاقات لتملأ الصف عندما يحتوي الصف على عناصر
  // أقل من عدد الأعمدة (مثال: منتج واحد فقط، أو صف أخير غير مكتمل) —
  // فكل بطاقة تحافظ على نفس عرض بقية البطاقات في الشبكة دائماً.
  const colBasis = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;

  return (
    // ملاحظة: 'pgrid' تُطبَّق دائماً (وليس فقط عند xs/sm/lg) لضمان أن
    // --pcard-img-h معرّفة دوماً؛ سابقاً كانت تُطبَّق فقط كمعدِّل عند
    // بعض الأحجام، فكان الحجم الافتراضي (md) بلا قيمة للمتغيّر وتنهار
    // صورة البطاقة إلى ارتفاع صفري.
    <div
      // key={gridSize}: يجبر React على تفكيك وإعادة تركيب هذه الحاوية
      // بالكامل (بدل تحديثها فقط) عند تبديل حجم الشبكة (S/M/L/XL).
      // بدونها، كان react-virtual أحياناً يحتفظ بقياسات ارتفاع صفوف
      // من الحجم القديم قبل أن تتم إعادة قياسها بالكامل عبر
      // rowVirtualizer.measure()، فتظهر البطاقات متراكبة/متداخلة
      // لحظة الانتقال بين نمطين مختلفين لهما نفس عدد الأعمدة لكن
      // ارتفاع صف مختلف (مثل L→M). التكلفة الوحيدة: يفقد موضع
      // التمرير عند تبديل الحجم، وهو مقبول لأنه فعل مقصود من المستخدم
      // أصلاً يغيّر ترتيب/أبعاد كل العناصر بأي حال.
      key={gridSize}
      className={`pos-grid-area pgrid ${gridMod}`}
      ref={scrollRef}
      style={{ overflow: 'auto' }}
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
