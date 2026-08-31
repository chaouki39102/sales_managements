// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocScanbar.tsx
//
// شريط البحث/المسح لمحرر المستندات — مطابق تماماً لشريط البحث في صفحة POS PRO
// (نفس الـ markup ونفس كلاسات الـ CSS `.pp-scanbar*` ونفس السلوك):
//   • أثناء الكتابة تظهر قائمة منسدلة بنتائج المنتجات (اسم/باركود/رمز)
//     للنقر أو التنقل بالأسهم ثم Enter.
//   • إذا كان النص تطابقاً تاماً للباركود (مسح ضوئي) يُضاف السطر مباشرة عند Enter.
//   • Enter بلا نتيجة يومض باللون الأحمر.
//   • زر كاميرا لمسح الباركود، وزر مسح النص عند الكتابة.
// يعمل على نوع `Product` الخاص بوحدة المستندات (وليس `ProductVariant`).
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect, useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import { proxyImage } from '@/lib/api/imageProxy';
import type { Product } from '../types/document.types';

interface Props {
  products: Product[];
  onAdd: (product: Product) => void;
  maxResults?: number;
  focusRef?: (el: HTMLInputElement | null) => void;
  /** شراء (FA/AA/…): السعر المعروض هو سعر الشراء HT، وإلا سعر البيع TTC */
  isPurchase?: boolean;
  /** إظهار شارة المخزون في النتائج */
  showStockOnCard?: boolean;
  /** كمية المخزون لكل منتج (product_id → عدد متاح) */
  stockData?: Record<string | number, number> | null;
  disabled?: boolean;
  /** فتح مسح الباركود بالكاميرا (زر الكاميرا) */
  onScanCamera?: () => void;
  /** ^↓ للتنقل بين النتائج */
  keyboardNavEnabled?: boolean;
}

function productMatches(p: Product, q: string): boolean {
  return (
    (p.name ?? '').toLowerCase().includes(q) ||
    (p.ref ?? '').toLowerCase().includes(q) ||
    (p.barcode ?? '').toLowerCase().includes(q)
  );
}

function productExactBarcode(p: Product, code: string): boolean {
  return p.barcode === code;
}

export default function DocScanbar({
  products, onAdd, maxResults = 8, focusRef, isPurchase = false,
  showStockOnCard = true, stockData, disabled = false, onScanCamera,
  keyboardNavEnabled = true,
}: Props) {
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi]     = useState(0);
  const [miss, setMiss] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // نتائج البحث مخفِّضة (debounced) حتى لا تُفلتر على كل ضغطة في الكتالوجات الكبيرة
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(code.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [code]);

  const results = useMemo(() => {
    const q = debouncedQuery;
    if (!q || q.startsWith('*')) return [];
    return products.filter(p => productMatches(p, q)).slice(0, maxResults);
  }, [products, debouncedQuery, maxResults]);

  const exact = useMemo(() => {
    const c = code.trim();
    if (!c) return null;
    return products.find(p => productExactBarcode(p, c)) ?? null;
  }, [products, code]);

  const searching = code.trim().toLowerCase() !== debouncedQuery;

  useEffect(() => setHi(0), [results.length]);

  useEffect(() => {
    const el = itemRefs.current.get(hi);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, []);

  useEffect(() => () => { if (missTimer.current) clearTimeout(missTimer.current); }, []);

  const flash = () => {
    setMiss(true);
    if (missTimer.current) clearTimeout(missTimer.current);
    missTimer.current = setTimeout(() => setMiss(false), 500);
  };

  const pick = (p: Product) => {
    onAdd(p);
    setCode('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleEnter = () => {
    if (exact) { pick(exact); return; }
    if (results.length > 0) { pick(results[Math.min(hi, results.length - 1)]); return; }
    setOpen(false);
    flash();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!keyboardNavEnabled) return;
      e.preventDefault();
      setOpen(true);
      if (results.length > 0) setHi(h => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      if (!keyboardNavEnabled) return;
      e.preventDefault();
      if (results.length > 0) setHi(h => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    }
  };

  const managed = (rem: number) => {
    if (rem <= 0) return 'pp-badge pp-badge--out';
    if (rem <= 5) return 'pp-badge pp-badge--low';
    return 'pp-badge pp-badge--ok';
  };

  return (
    <div className={`pp-scanbar-wrap${disabled ? ' is-disabled' : ''}`} ref={wrapRef}>
      <div className={`pp-scanbar${miss ? ' pp-scanbar--miss' : ''}`}>
        <i className="ti ti-scan" />
        <input
          ref={(el) => {
            inputRef.current = el;
            focusRef?.(el);
          }}
          value={code}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setCode(v);
            setOpen(!!v.trim() && !v.trim().startsWith('*'));
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (code.trim() && !code.trim().startsWith('*')) setOpen(true); }}
          placeholder={isPurchase ? 'امسح الباركود أو ابحث عن منتج…' : 'امسح الباركود أو ابحث عن منتج…'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="البحث عن منتج"
        />
        {code && !disabled && (
          <button
            type="button"
            className="pp-scanbar-clear"
            onClick={() => { setCode(''); setOpen(false); inputRef.current?.focus(); }}
            aria-label="مسح البحث"
          >
            <i className="ti ti-x" />
          </button>
        )}
        {onScanCamera && (
          <button type="button" className="pp-scanbar-go" onClick={() => onScanCamera?.()} aria-label="مسح بالكاميرا" disabled={disabled}>
            <i className="ti ti-camera" />
          </button>
        )}
      </div>

      {open && code.trim() && !code.trim().startsWith('*') && (
        <div className="pp-scanbar-dd">
          {results.length === 0 ? (
            <div className="pp-scanbar-dd-empty">
              {searching ? (
                <><i className="ti ti-loader animate-spin" /> جارٍ البحث…</>
              ) : (
                <><i className="ti ti-search-off" /> لا توجد نتائج مطابقة</>
              )}
            </div>
          ) : (
            results.map((p, i) => {
              const tvaRate = p.tva?.rate ?? 0;
              const price = isPurchase
                ? (typeof p.purchase_price_ht === 'number' ? p.purchase_price_ht : Number(p.purchase_price_ht ?? 0) || 0)
                : Number(p.default_selling_price_ht ?? 0) * (1 + tvaRate / 100);
              const img = proxyImage(null, 120);
              const manages = p.manages_stock !== false;
              const rawStock = typeof stockData?.[p.id] === 'number' ? stockData[p.id] as number
                : (typeof p.stock_quantity === 'number' ? p.stock_quantity : undefined);
              const remaining = rawStock === undefined ? undefined : Math.max(0, rawStock);
              const showStock = manages && remaining !== undefined;
              return (
                <button
                  key={p.id}
                  ref={(el) => { if (el) itemRefs.current.set(i, el); else itemRefs.current.delete(i); }}
                  type="button"
                  className={`pp-scanbar-dd-item${i === hi ? ' on' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(p)}
                  disabled={disabled}
                >
                  <span className="pp-scanbar-dd-img">
                    {img ? <img src={img} alt="" loading="lazy" /> : <i className="ti ti-package" />}
                  </span>
                  <span className="pp-scanbar-dd-main">
                    <span className="pp-scanbar-dd-name">
                      <span className="pp-scanbar-dd-name-txt">{p.name}</span>
                      {showStockOnCard && showStock && (
                        <span className={managed(remaining!)}>{remaining! <= 0 ? 'نفد' : `متوفر: ${remaining!}`}</span>
                      )}
                    </span>
                    <span className="pp-scanbar-dd-sub">{p.ref || p.barcode || ''}</span>
                  </span>
                  <span className="pp-scanbar-dd-price" dir="ltr">{formatDZD(price)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
