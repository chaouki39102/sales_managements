// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProProductDrawer.tsx
//
// اختيار المنتجات لصفحة POS PRO. قرّرنا استخدام الـ Modal المشترك بدل Drawer:
//  1. Modal هو المكوّن الرسمي الوحيد للطبقات — يمنح scroll-lock + فتح/إغلاق
//     Escape + أنيميشن .ov/.modal مجاناً (قاعدة المشروع: لا نصنع overlays يدوية).
//  2. لصفحة نقطة بيع، البقاء "مفتوحاً" أثناء إضافة عدة منتجات أسرع من أي
//     Drawer يغلق عند كل اختيار — المودال يبقى مفتوحاً والكاشير يضيف عدة
//     أصناف ثم يغلق بـ "تم" أو Escape.
//  3. البحث فوري بالكامل على العميل (مصفوفة المتغيرات كاملة في الذاكرة)،
//     وحقل باركود مخصص: Enter → إضافة فورية للصنف دون مغادرة الحقل.
//
// يحترم إعدادات POS (قابلة للإيقاف من POSSettingsModal):
//  • keyboardNavEnabled — الأسهم ↑↓ تتنقل في الشبكة و Enter تضيف الصنف المميز
//  • advanceOnAdd       — بعد الإضافة يتقدم التمييز للصنف التالي (إضافة متسلسلة)
//  • clearSearchOnAdd   — بعد الإضافة يُفرَّغ حقل البحث (يتعارض عمداً مع advance)
//  • priceDisplayMode   — السعر الرئيسي الكبير: TTC أو HT
//  • showStockOnCard    — إظهار شارة المخزون على البطاقة
//  • gridSize           — الحجم الابتدائي لشبكة المنتجات (xs/sm/md/lg)
//
// تفضيلات العرض خاصة بالمودال (مثل صف السلة البسيط/الكامل) وتُحفظ في localStorage:
//  • pos-pro-drawer-view — 'grid' | 'list' (الافتراضي من defaultView)
//  • pos-pro-drawer-grid — 'xs' | 'sm' | 'md' | 'lg' (الافتراضي من gridSize)
//
// بطاقة المنتج تحمل نفس شارات POS الكلاسيكي:
//  • كمية في السلة + أزرار +/− (تحل محل زر الإضافة)
//  • أفضل خصم كمي (-% / -دج)
//  • عدد الخيارات (N خيارات)
//  • ضغطة مطوّلة (500ms) أو زر "i" → فتح نافذة معلومات المنتج الكاملة
//  • اختيار التغليف (عند وجود أكثر من تغليفة) — السعر يتبع التغليفة المختارة
//
// شريط أدوات العرض يحوي أيضاً ترتيب النتائج: الاسم / السعر (تصاعدي/تنازلي) /
// المخزون (الأقل/الأعلى أولاً) — القائمة المفلترة تُرتَّب دون فقدان التمييز.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import POSProProductInfoModal from './POSProProductInfoModal';
import { formatDZD } from '@/pos/utils/calculations';
import { getVariantPrice, isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ProductVariant, ProductPackaging, Family, PriceLevel, CartItem } from '@/types';
import type { GridDefaultSize, PriceDisplayMode } from '@/pos/hooks/usePOSSettings';

const GRID_SIZE_OPTIONS: GridDefaultSize[] = ['xs', 'sm', 'md', 'lg'];

const SORT_OPTIONS = [
  { v: 'name',       l: 'الاسم' },
  { v: 'price-asc',  l: 'السعر (تصاعدي)' },
  { v: 'price-desc', l: 'السعر (تنازلي)' },
  { v: 'stock-asc',  l: 'المخزون (الأقل أولاً)' },
  { v: 'stock-desc', l: 'المخزون (الأعلى أولاً)' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['v'];

function readLS(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, val: string) {
  try {
    window.localStorage.setItem(key, val);
  } catch {
    /* storage-denied → non-blocking */
  }
}

/** أفضل خصم كمي (بنفس ترتيب POS الكلاسيكي: الأعلى نسبة أولاً ثم المبلغ) */
function bestDiscountFor(v: ProductVariant) {
  const d = (v.quantity_discounts ?? [])
    .filter(d => d.active !== false)
    .sort((a, b) => {
      const aPct = a.discount_percentage ?? (a.discount_amount && a.discount_amount > 0 ? 1 : 0);
      const bPct = b.discount_percentage ?? (b.discount_amount && b.discount_amount > 0 ? 1 : 0);
      return bPct - aPct;
    })[0];
  if (!d) return null;
  const hasPct = (d.discount_percentage ?? 0) > 0;
  const hasAmt = (d.discount_amount ?? 0) > 0;
  return hasPct || hasAmt ? d : null;
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
    parts.push(<mark key={key++} className="pp-hl-text">{text.slice(idx, idx + query.length)}</mark>);
    lastIdx = idx + query.length;
    idx = lower.indexOf(q, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : [text];
}

function StockBadge({ v, inCartUnits }: { v: ProductVariant; inCartUnits: number }) {
  if (!v.manages_stock) return null;
  const stock = v.current_stock ?? 0;
  const remaining = Math.max(0, stock - inCartUnits);
  const cls = remaining <= 0 ? 'pp-badge pp-badge--out' : (remaining <= 5 ? 'pp-badge pp-badge--low' : 'pp-badge pp-badge--ok');
  const label = remaining <= 0 ? 'نفد المخزون' : `متوفر: ${remaining}`;
  return <span className={cls}>{label}</span>;
}

interface Props {
  open:        boolean;
  variants:    ProductVariant[];
  families:    Family[];
  cartCount:   number;
  cartItems?:  CartItem[];
  onAdd:       (variant: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
  onClose:     () => void;
  onQty?:      (variantId: number, newQty: number) => void;
  priceLevels?: PriceLevel[];
  selectedPriceLevelId?: number | null;
  priceDisplayMode?: PriceDisplayMode;
  showStockOnCard?: boolean;
  gridSize?: GridDefaultSize;
  defaultView?: 'grid' | 'list';
  allowNegativeStock?: boolean;
  clearSearchOnAdd?: boolean;
  keyboardNavEnabled?: boolean;
  advanceOnAdd?: boolean;
  /** Base-unit quantity already in the cart per variant id (stock badge subtracts it) */
  qtyInCartById?: Map<number, number>;
}

interface PPCardProps {
  v: ProductVariant;
  idx: number;
  hi: boolean;
  query: string;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  priceDisplayMode: PriceDisplayMode;
  showStockOnCard: boolean;
  allowNegativeStock: boolean;
  inCartQty: number;
  qtyInCartUnits: number;
  variantCount: number;
  onAdd: Props['onAdd'];
  onQty?: Props['onQty'];
  onInfo: (v: ProductVariant) => void;
  onHi: (idx: number) => void;
  elRef?: (el: HTMLElement | null) => void;
}

const PPCard = React.memo(function PPCard({
  v, idx, hi, query, priceLevels, selectedPriceLevelId, priceDisplayMode,
  showStockOnCard, allowNegativeStock, inCartQty, qtyInCartUnits, variantCount,
  onAdd, onQty, onInfo, onHi, elRef,
}: PPCardProps) {
  const rawStock = v.current_stock;
  const unknownStock = rawStock === undefined;
  const available = rawStock !== undefined ? Math.max(0, rawStock - qtyInCartUnits) : rawStock;
  const outStock = isVariantOutOfStock(v, allowNegativeStock)
    || (v.manages_stock && !unknownStock && (available ?? 0) <= 0 && !allowNegativeStock && !v.allow_negative_stock);

  const bestDiscount = useMemo(() => bestDiscountFor(v), [v.quantity_discounts]);

  // ── التغليف (نفس منطق POS الكلاسيكي) ───────────────────────────────────────
  const packagings = useMemo(() => {
    const raw = v.packagings ?? (v.product as any)?.packagings;
    if (!raw?.length) return [] as ProductPackaging[];
    return raw.filter((p: ProductPackaging) => p.active !== false)
      .sort((a: ProductPackaging, b: ProductPackaging) => a.display_order - b.display_order);
  }, [v.packagings, v.product]);

  const defaultPkg = useMemo(
    () => packagings.find((p: ProductPackaging) => p.is_default) ?? packagings[0] ?? null,
    [packagings],
  );
  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(null);
  useEffect(() => { setSelectedPkgId(defaultPkg?.id ?? null); }, [defaultPkg?.id]);

  const activePkg  = packagings.find((p: ProductPackaging) => p.id === selectedPkgId) ?? defaultPkg;
  const packQty    = activePkg ? Math.max(1, Number(activePkg.quantity) || 1) : 1;
  const showPkgSel = packagings.length > 1;

  const priceHtBase = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const priceHt  = priceHtBase * packQty;
  const tvaRate  = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);
  const isLevelPriced = selectedPriceLevelId != null && priceHtBase !== v.default_selling_price_ht;
  const img = v.image_url ?? (v.product as any)?.default_image ?? null;
  const primary   = priceDisplayMode === 'ht' ? priceHt : priceTtc;
  const secondary = priceDisplayMode === 'ht' ? priceTtc : priceHtBase;

  // ── ضغطة مطوّلة (500ms) → فتح نافذة معلومات المنتج ─────────────────────────
  // longPressFired: يُفعَّل عند اشتغال المؤقّت ويمنع click الصادر بعد الإفلات
  // من إضافة المنتج للسلة (نفس سبب منع النقر في شاشات اللمس).
  const longPressFired = useRef(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStarted = useRef(false);
  const handlePointerDown = useCallback(() => {
    pressStarted.current = true;
    pressTimerRef.current = setTimeout(() => {
      if (pressStarted.current) {
        longPressFired.current = true;
        onInfo(v);
      }
    }, 500);
  }, [onInfo, v]);
  const handlePointerUp = useCallback(() => {
    pressStarted.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);

  const inCart = inCartQty > 0;

  const handleAdd = useCallback((qty: number) => {
    if (outStock) return;
    onAdd(v, qty, activePkg);
  }, [outStock, onAdd, v, activePkg]);

  const handleDec = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQty?.(v.id as number, Math.max(0, inCartQty - 1));
  }, [onQty, v.id, inCartQty]);

  return (
    <div
      data-hl-idx={idx}
      ref={elRef}
      role="button"
      tabIndex={-1}
      className={[
        'pp-card',
        outStock && 'pp-card--out',
        inCart && 'pp-card--incart',
        hi && 'pp-card--hi',
      ].filter(Boolean).join(' ')}
      onClick={() => {
        if (longPressFired.current) { longPressFired.current = false; return; }
        if (outStock) { onHi(idx); return; }
        handleAdd(1);
      }}
      onMouseEnter={() => onHi(idx)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={v.product?.name}
    >
      <div className="pp-card-img">
        {img ? <img src={img} alt="" loading="lazy" /> : <i className="ti ti-package" />}

        <button
          type="button"
          className="pp-card-info-btn"
          onClick={(e) => { e.stopPropagation(); onInfo(v); }}
          title="معلومات المنتج"
          aria-label="معلومات المنتج"
        >
          <i className="ti ti-info-circle" />
        </button>

        {bestDiscount && (
          <span className="pp-card-disc">
            {bestDiscount.discount_percentage != null && bestDiscount.discount_percentage > 0
              ? `-${bestDiscount.discount_percentage}%`
              : bestDiscount.discount_amount != null && bestDiscount.discount_amount > 0
                ? `-${formatDZD(bestDiscount.discount_amount)}`
                : null}
          </span>
        )}
        {inCart && <span className="pp-card-incart" key={inCartQty}>{inCartQty}</span>}
        {outStock && <span className="pp-card-out">نفذ</span>}
        {variantCount > 1 && <span className="pp-card-variants">{variantCount} خيارات</span>}
      </div>

      <div className="pp-card-name">
        {query ? highlightText(v.product?.name ?? '', query) : v.product?.name}
      </div>
      <div className="pp-card-ref">{v.ref || v.barcode || ''}</div>

      <div className={`pp-card-price${isLevelPriced ? ' pp-card-price--lvl' : ''}`}>{formatDZD(primary)}</div>

      {showPkgSel && (
        <select
          className="pp-card-pkg"
          value={activePkg?.id ?? ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setSelectedPkgId(Number(e.target.value))}
        >
          {packagings.map((p: ProductPackaging) => (
            <option key={p.id} value={p.id}>
              {p.label}{p.quantity > 1 ? ` (${p.quantity})` : ''}
            </option>
          ))}
        </select>
      )}

      <div className="pp-card-bottom">
        {inCart && onQty ? (
          <div className="pp-card-qty">
            <button type="button" className="pp-card-qty-btn" onClick={handleDec} title="تقليل">
              <i className="ti ti-minus" />
            </button>
            <span className="pp-card-qty-val" key={inCartQty}>{inCartQty}</span>
            <button
              type="button"
              className="pp-card-qty-btn pp-card-qty-inc"
              onClick={(e) => { e.stopPropagation(); handleAdd(1); }}
              title="زيادة"
              disabled={outStock}
            >
              <i className="ti ti-plus" />
            </button>
          </div>
        ) : (
          <>
            {showStockOnCard && <StockBadge v={v} inCartUnits={qtyInCartUnits} />}
            <span className="pp-card-ht">{formatDZD(secondary)}</span>
          </>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.v === next.v
  && prev.idx === next.idx
  && prev.hi === next.hi
  && prev.query === next.query
  && prev.inCartQty === next.inCartQty
  && prev.qtyInCartUnits === next.qtyInCartUnits
  && prev.variantCount === next.variantCount
  && prev.selectedPriceLevelId === next.selectedPriceLevelId
  && prev.allowNegativeStock === next.allowNegativeStock
  && prev.showStockOnCard === next.showStockOnCard
  && prev.priceDisplayMode === next.priceDisplayMode
  && prev.priceLevels === next.priceLevels
  && prev.onAdd === next.onAdd
  && prev.onQty === next.onQty
  && prev.onInfo === next.onInfo);

interface PPRowProps {
  v: ProductVariant;
  idx: number;
  hi: boolean;
  query: string;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  inCartQty: number;
  qtyInCartUnits: number;
  outStock: boolean;
  onAdd: Props['onAdd'];
  onQty?: Props['onQty'];
  onInfo: (v: ProductVariant) => void;
  onHi: (idx: number) => void;
  elRef?: (el: HTMLElement | null) => void;
}

const PPRow = React.memo(function PPRow({
  v, idx, hi, query, priceLevels, selectedPriceLevelId, inCartQty, qtyInCartUnits, outStock, onAdd, onQty, onInfo, onHi, elRef,
}: PPRowProps) {
  const priceHt = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const tvaRate = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);
  const inCart = inCartQty > 0;
  const stock = v.current_stock ?? 0;
  const remaining = Math.max(0, stock - qtyInCartUnits);

  const handleDec = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQty?.(v.id as number, Math.max(0, inCartQty - 1));
  }, [onQty, v.id, inCartQty]);

  return (
    <div
      data-hl-idx={idx}
      ref={elRef}
      role="button"
      tabIndex={-1}
      className={[
        'pp-lrow',
        outStock && 'pp-lrow--out',
        inCart && 'pp-lrow--incart',
        hi && 'pp-lrow--hi',
      ].filter(Boolean).join(' ')}
      onClick={() => { if (!outStock) onAdd(v, 1, null); else onHi(idx); }}
      onDoubleClick={() => { if (!outStock) onAdd(v, 2, null); }}
      onMouseEnter={() => onHi(idx)}
      title={v.product?.name}
    >
      <div className="pp-lrow-prod">
        <div className="pp-lrow-name">{query ? highlightText(v.product?.name ?? '', query) : v.product?.name}</div>
        <div className="pp-lrow-ref">{v.ref || v.barcode || ''}</div>
      </div>
      <div className="pp-lcol-unit">{v.unit?.abbreviation ?? ''}</div>
      <div className="pp-lcol-price">{formatDZD(priceHt)}</div>
      <div className="pp-lcol-tva">{tvaRate > 0 ? `${tvaRate}%` : '—'}</div>
      <div className="pp-lcol-ttc">{formatDZD(priceTtc)}</div>
      <div className="pp-lcol-stock">
        {v.manages_stock ? (
          <span className={`pp-badge ${outStock ? 'pp-badge--out' : remaining <= 5 ? 'pp-badge--low' : 'pp-badge--ok'}`}>
            {outStock ? 'نفد' : remaining <= 5 ? `قليل: ${remaining}` : `متوفر: ${remaining}`}
          </span>
        ) : (
          <span className="pp-badge pp-badge--ok">بدون</span>
        )}
      </div>
      <div className="pp-lrow-actions">
        <button
          type="button"
          className="pp-lrow-info"
          onClick={(e) => { e.stopPropagation(); onInfo(v); }}
          title="معلومات المنتج"
          aria-label="معلومات المنتج"
        >
          <i className="ti ti-info-circle" />
        </button>
        {inCart && onQty ? (
          <div className="pp-lrow-qty">
            <button type="button" className="pp-lrow-qty-btn" onClick={handleDec} title="تقليل">
              <i className="ti ti-minus" />
            </button>
            <span className="pp-lrow-qty-val" key={inCartQty}>{inCartQty}</span>
            <button
              type="button"
              className="pp-lrow-qty-btn"
              onClick={(e) => { e.stopPropagation(); onAdd(v, 1, null); }}
              title="زيادة"
              disabled={outStock}
            >
              <i className="ti ti-plus" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pp-lrow-add"
            onClick={(e) => { e.stopPropagation(); onAdd(v, 1, null); }}
            disabled={outStock}
            title="إضافة للسلة"
          >
            <i className="ti ti-plus" />
          </button>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.v === next.v
  && prev.idx === next.idx
  && prev.hi === next.hi
  && prev.query === next.query
  && prev.inCartQty === next.inCartQty
  && prev.qtyInCartUnits === next.qtyInCartUnits
  && prev.outStock === next.outStock
  && prev.selectedPriceLevelId === next.selectedPriceLevelId
  && prev.priceLevels === next.priceLevels
  && prev.onAdd === next.onAdd
  && prev.onQty === next.onQty
  && prev.onInfo === next.onInfo);

export default function POSProProductDrawer({
  open, variants, families, cartCount, cartItems = [], onAdd, onClose, onQty,
  priceLevels = [], selectedPriceLevelId = null,
  priceDisplayMode = 'ttc', showStockOnCard = true, gridSize = 'md', defaultView = 'grid',
  allowNegativeStock = false,
  clearSearchOnAdd = false, keyboardNavEnabled = true, advanceOnAdd = true,
  qtyInCartById,
}: Props) {
  const [query, setQuery]     = useState('');
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [hi, setHi]           = useState(0);
  const [view, setView]       = useState<'grid' | 'list'>(() => {
    const saved = readLS('pos-pro-drawer-view', defaultView);
    return saved === 'list' ? 'list' : 'grid';
  });
  const [gsize, setGsize]     = useState<GridDefaultSize>(() => {
    const saved = readLS('pos-pro-drawer-grid', gridSize);
    return (GRID_SIZE_OPTIONS as string[]).includes(saved) ? saved as GridDefaultSize : gridSize;
  });
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const saved = readLS('pos-pro-drawer-sort', 'name');
    return (SORT_OPTIONS as readonly { v: string }[]).some(o => o.v === saved) ? saved as SortKey : 'name';
  });
  const [infoVariant, setInfoVariant] = useState<ProductVariant | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const cardRefs  = useRef(new Map<number, HTMLElement>());
  const rowRefs   = useRef(new Map<number, HTMLElement>());

  useEffect(() => { writeLS('pos-pro-drawer-view', view); }, [view]);
  useEffect(() => { writeLS('pos-pro-drawer-grid', gsize); }, [gsize]);
  useEffect(() => { writeLS('pos-pro-drawer-sort', sortBy); }, [sortBy]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQuery('');
    setFamilyId(null);
    setScanInput('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = variants;
    if (familyId != null) list = list.filter(v => v.product?.family?.id === familyId);
    if (q) {
      list = list.filter(v =>
        (v.product?.name ?? '').toLowerCase().includes(q) ||
        (v.variant_name ?? '').toLowerCase().includes(q) ||
        (v.barcode ?? '').toLowerCase().includes(q) ||
        (v.ref ?? '').toLowerCase().includes(q) ||
        (v.product?.ref ?? '').toLowerCase().includes(q) ||
        (v as any).barcodes?.some((bc: { barcode: string }) => bc.barcode.toLowerCase().includes(q)),
      );
    }
    const byName = (a: ProductVariant, b: ProductVariant) =>
      (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ar');
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': {
          const d = getVariantPrice(a, selectedPriceLevelId, priceLevels) - getVariantPrice(b, selectedPriceLevelId, priceLevels);
          return d !== 0 ? d : byName(a, b);
        }
        case 'price-desc': {
          const d = getVariantPrice(b, selectedPriceLevelId, priceLevels) - getVariantPrice(a, selectedPriceLevelId, priceLevels);
          return d !== 0 ? d : byName(a, b);
        }
        case 'stock-asc': {
          const sA = a.manages_stock ? (a.current_stock ?? 0) : Infinity;
          const sB = b.manages_stock ? (b.current_stock ?? 0) : Infinity;
          const d = sA - sB;
          return d !== 0 ? d : byName(a, b);
        }
        case 'stock-desc': {
          const sA = a.manages_stock ? (a.current_stock ?? 0) : -Infinity;
          const sB = b.manages_stock ? (b.current_stock ?? 0) : -Infinity;
          const d = sB - sA;
          return d !== 0 ? d : byName(a, b);
        }
        default:
          return byName(a, b);
      }
    });
  }, [variants, familyId, query, sortBy, selectedPriceLevelId, priceLevels]);

  // أعد التمييز لأول نتيجة عند تغيّر القائمة المفلترة
  useEffect(() => { setHi(0); }, [filtered.length]);

  // مرّر البطاقة/الصف المميز لتبقى ظاهرة (سجّلات قديمة لمنقول مفصول → isConnected)
  useEffect(() => {
    const map = view === 'grid' ? cardRefs : rowRefs;
    const el = map.current.get(hi);
    if (el && el.isConnected) el.scrollIntoView({ block: 'nearest' });
  }, [hi, view]);

  // سجّل البطاقات/الصفوف في خريطة ثابتة تُقرأ من data-hl-idx (لا حاجة لأغلفة مؤقتة)
  const registerCard = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const i = Number(el.dataset.hlIdx);
    if (!Number.isNaN(i)) cardRefs.current.set(i, el);
  }, []);
  const registerRow = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const i = Number(el.dataset.hlIdx);
    if (!Number.isNaN(i)) rowRefs.current.set(i, el);
  }, []);

  // خريطة كمية السلة (بالوحدات) + عدد الخيارات لكل منتج
  const cartQtyByVariantId = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of cartItems) {
      if (!m.has(i.variant_id)) m.set(i.variant_id, i.quantity);
    }
    return m;
  }, [cartItems]);

  const variantCountById = useMemo(() => {
    const m = new Map<number, number>();
    for (const v of variants) m.set(v.product_id, (m.get(v.product_id) ?? 0) + 1);
    return m;
  }, [variants]);

  const handleAdd = useCallback((v: ProductVariant) => {
    onAdd(v);
    if (clearSearchOnAdd) setQuery('');
    else if (advanceOnAdd && filtered.length > 0) {
      setHi(h => (h + 1 < filtered.length ? h + 1 : 0));
    }
    searchRef.current?.focus();
  }, [onAdd, clearSearchOnAdd, advanceOnAdd, filtered.length]);

  const handleHi = useCallback((i: number) => setHi(i), []);
  const handleInfo = useCallback((v: ProductVariant) => setInfoVariant(v), []);

  // لوحة المفاتيح على حقل البحث: ↑↓ تتنقل في الشبكة (عند تفعيل keyboardNav)
  // و Enter يضيف الصنف المميز (أو أول نتيجة عند تعطيل الأسهم — مثل POS الكلاسيكي)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      if (!keyboardNavEnabled) return;
      e.preventDefault();
      setHi(h => (h + 1 < filtered.length ? h + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      if (!keyboardNavEnabled) return;
      e.preventDefault();
      setHi(h => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      const v = filtered[Math.min(hi, filtered.length - 1)];
      if (v) { e.preventDefault(); handleAdd(v); }
    }
  };

  // مطابقة الباركود بالضبط (أسرع من البحث النصي — يدعم الكاشير السريع)
  const handleScanEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const code = scanInput.trim();
    if (!code) return;
    const hit = variants.find(v =>
      v.barcode === code ||
      (v as any).barcodes?.some((bc: { barcode: string }) => bc.barcode === code),
    );
    if (hit) {
      handleAdd(hit);
      setScanInput('');
    } else {
      const box = e.currentTarget;
      box.classList.add('pp-scan--miss');
      setTimeout(() => box.classList.remove('pp-scan--miss'), 400);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="اختيار المنتجات"
      subtitle={`${cartCount} صنف في السلة حالياً`}
      size="xl"
      resizable={false}
      footer={
        <button type="button" className="btn btn-p" onClick={onClose}>
          <i className="ti ti-check" />
          تم ({filtered.length} منتج)
        </button>
      }
      footerLeft={
        <span className="pp-cart-count">
          <i className="ti ti-shopping-cart" />
          في السلة: {cartCount}
        </span>
      }
    >
      <div className="pp-drawer">
        {/* شريط البحث */}
        <div className="pp-search-row">
          <div className="pp-search">
            <i className="ti ti-search" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="ابحث بالاسم أو الباركود أو الرمز…"
            />
            {query && (
              <button type="button" className="pp-search-clear" onClick={() => setQuery('')}>
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          {/* حقل المسح الضوئي للباركود */}
          <div className="pp-scan">
            <i className="ti ti-scan" />
            <input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleScanEnter}
              placeholder="امسح الباركود ثم Enter"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* تصنيفات */}
        <div className="pp-chips">
          <button
            type="button"
            className={`pp-chip${familyId === null ? ' on' : ''}`}
            onClick={() => setFamilyId(null)}
          >
            الكل ({variants.length})
          </button>
          {families.map(f => {
            const count = variants.filter(v => v.product?.family?.id === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                className={`pp-chip${familyId === f.id ? ' on' : ''}`}
                onClick={() => setFamilyId(familyId === f.id ? null : f.id)}
              >
                {f.name} ({count})
              </button>
            );
          })}
        </div>

        {/* شريط أدوات العرض: شبكة/قائمة + حجم الشبكة */}
        <div className="pp-drawer-tools">
          <div className="pp-tool-group" aria-label="عرض المنتجات">
            <button
              type="button"
              className={`pp-tool-btn${view === 'grid' ? ' on' : ''}`}
              onClick={() => setView('grid')}
              title="عرض شبكي"
            >
              <i className="ti ti-layout-grid" />
            </button>
            <button
              type="button"
              className={`pp-tool-btn${view === 'list' ? ' on' : ''}`}
              onClick={() => setView('list')}
              title="عرض قائمة"
            >
              <i className="ti ti-list" />
            </button>
          </div>
          {view === 'grid' && (
            <div className="pp-tool-group" aria-label="حجم الشبكة">
              {GRID_SIZE_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`pp-tool-btn pp-tool-btn--sm${gsize === s ? ' on' : ''}`}
                  onClick={() => setGsize(s)}
                  title={`شبكة ${s.toUpperCase()}`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <div className="pp-sort" aria-label="ترتيب النتائج">
            <i className="ti ti-sort-ascending" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              title="ترتيب النتائج"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* الشبكة أو القائمة */}
        {view === 'grid' ? (
          <div className={`pp-grid pp-grid--${gsize}`}>
            {filtered.map((v, i) => (
              <PPCard
                key={v.id}
                v={v}
                idx={i}
                hi={i === hi}
                query={query.trim()}
                priceLevels={priceLevels}
                selectedPriceLevelId={selectedPriceLevelId}
                priceDisplayMode={priceDisplayMode}
                showStockOnCard={showStockOnCard}
                allowNegativeStock={allowNegativeStock}
                inCartQty={cartQtyByVariantId.get(v.id as number) ?? 0}
                qtyInCartUnits={qtyInCartById?.get(v.id as number) ?? 0}
                variantCount={variantCountById.get(v.product_id) ?? 1}
                onAdd={onAdd}
                onQty={onQty}
                onInfo={handleInfo}
                onHi={handleHi}
                elRef={registerCard}
              />
            ))}
            {filtered.length === 0 && (
              <div className="pp-empty">
                <i className="ti ti-search-off" />
                <span>لا توجد منتجات مطابقة</span>
              </div>
            )}
          </div>
        ) : (
          <div className="pp-list">
            <div className="pp-lhead">
              <span>المنتج</span>
              <span>الوحدة</span>
              <span>HT</span>
              <span>TVA</span>
              <span>TTC</span>
              <span>المخزون</span>
              <span className="pp-lhead-actions">إضافة</span>
            </div>
            {filtered.map((v, i) => (
              <PPRow
                key={v.id}
                v={v}
                idx={i}
                hi={i === hi}
                query={query.trim()}
                priceLevels={priceLevels}
                selectedPriceLevelId={selectedPriceLevelId}
                inCartQty={cartQtyByVariantId.get(v.id as number) ?? 0}
                qtyInCartUnits={qtyInCartById?.get(v.id as number) ?? 0}
                outStock={isVariantOutOfStock(v, allowNegativeStock)}
                onAdd={onAdd}
                onQty={onQty}
                onInfo={handleInfo}
                onHi={handleHi}
                elRef={registerRow}
              />
            ))}
            {filtered.length === 0 && (
              <div className="pp-empty">
                <i className="ti ti-search-off" />
                <span>لا توجد منتجات مطابقة</span>
              </div>
            )}
          </div>
        )}

        {/* نافذة معلومات المنتج (ضغطة مطوّلة أو زر i على البطاقة) */}
        {infoVariant && (
          <POSProProductInfoModal
            open
            variant={infoVariant}
            siblings={variants.filter(v => v.product_id === infoVariant.product_id)}
            priceLevels={priceLevels}
            selectedPriceLevelId={selectedPriceLevelId}
            priceDisplayMode={priceDisplayMode}
            allowNegativeStock={allowNegativeStock}
            qtyInCartById={qtyInCartById}
            onAdd={onAdd}
            onClose={() => setInfoVariant(null)}
          />
        )}
      </div>
    </Modal>
  );
}
