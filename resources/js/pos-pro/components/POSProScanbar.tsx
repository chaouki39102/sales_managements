// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProScanbar.tsx
//
// شريط البحث/المسح العام في أعلى POS PRO:
//   • أثناء الكتابة تظهر قائمة منسدلة بنتائج المنتجات (اسم/باركود/رمز)
//     للنقر أو التنقل بالأسهم ثم Enter.
//   • إذا كان النص تطابقاً تاماً للباركود (مسح ضوئي) يُضاف مباشرة عند Enter.
//   • Enter بلا نتيجة يومض باللون الأحمر.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect, useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { ProductVariant } from '@/types';

interface Props {
  variants:   ProductVariant[];
  onAdd:      (variant: ProductVariant) => void;
  maxResults?: number;
  focusRef?:   (el: HTMLInputElement | null) => void;
}

function variantMatches(v: ProductVariant, q: string): boolean {
  return (
    (v.product?.name ?? '').toLowerCase().includes(q) ||
    (v.variant_name ?? '').toLowerCase().includes(q) ||
    (v.barcode ?? '').toLowerCase().includes(q) ||
    (v.ref ?? '').toLowerCase().includes(q) ||
    (v.product?.ref ?? '').toLowerCase().includes(q) ||
    (v as any).barcodes?.some((bc: { barcode: string }) =>
      bc.barcode.toLowerCase().includes(q),
    ) === true
  );
}

function variantExactBarcode(v: ProductVariant, code: string): boolean {
  return (
    v.barcode === code ||
    (v as any).barcodes?.some((bc: { barcode: string }) => bc.barcode === code) === true
  );
}

export default function POSProScanbar({ variants, onAdd, maxResults = 8, focusRef }: Props) {
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi]     = useState(0);
  const [miss, setMiss] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // نتائج البحث مُخفِّضة (debounced) حتى لا تُفلتر على كل ضغطة في الكتالوجات الكبيرة
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(code.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [code]);

  const results = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return [];
    return variants.filter(v => variantMatches(v, q)).slice(0, maxResults);
  }, [variants, debouncedQuery, maxResults]);

  const exact = useMemo(() => {
    const c = code.trim();
    if (!c) return null;
    return variants.find(v => variantExactBarcode(v, c)) ?? null;
  }, [variants, code]);

  const searching = code.trim().toLowerCase() !== debouncedQuery;

  useEffect(() => setHi(0), [results.length]);

  // إغلاق القائمة عند النقر خارجها
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

  const pick = (v: ProductVariant) => {
    onAdd(v);
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
      e.preventDefault();
      setOpen(true);
      if (results.length > 0) setHi(h => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
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

  return (
    <div className="pp-scanbar-wrap" ref={wrapRef}>
      <div className={`pp-scanbar${miss ? ' pp-scanbar--miss' : ''}`}>
        <i className="ti ti-scan" />
        <input
          ref={(el) => {
            inputRef.current = el;
            focusRef?.(el);
          }}
          value={code}
          onChange={(e) => { setCode(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (code.trim()) setOpen(true); }}
          placeholder="امسح الباركود أو ابحث عن منتج…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {code && (
          <button
            type="button"
            className="pp-scanbar-clear"
            onClick={() => { setCode(''); setOpen(false); inputRef.current?.focus(); }}
          >
            <i className="ti ti-x" />
          </button>
        )}
        <button type="button" className="pp-scanbar-go" onClick={handleEnter} title="أضف">
          <i className="ti ti-corner-down-left" />
        </button>
      </div>

      {open && code.trim() && (
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
            results.map((v, i) => {
              const tvaRate = v.tva?.rate ?? 0;
              const priceTtc = v.default_selling_price_ht * (1 + tvaRate / 100);
              const img = (v as any).image_url ?? v.product?.default_image ?? v.product?.images?.[0] ?? null;
              const stock = v.current_stock ?? 0;
              const showStock = v.manages_stock;
              const stockCls = stock <= 0
                ? 'pp-badge pp-badge--out'
                : (stock <= 5 ? 'pp-badge pp-badge--low' : 'pp-badge pp-badge--ok');
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`pp-scanbar-dd-item${i === hi ? ' on' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(v)}
                >
                  <span className="pp-scanbar-dd-img">
                    {img ? <img src={img} alt="" loading="lazy" /> : <i className="ti ti-package" />}
                  </span>
                  <span className="pp-scanbar-dd-main">
                    <span className="pp-scanbar-dd-name">
                      <span className="pp-scanbar-dd-name-txt">{v.product?.name ?? ''}</span>
                      {showStock && <span className={stockCls}>{stock <= 0 ? 'نفد' : `متوفر: ${stock}`}</span>}
                    </span>
                    <span className="pp-scanbar-dd-sub">{v.ref || v.barcode || ''}</span>
                  </span>
                  <span className="pp-scanbar-dd-price" dir="ltr">{formatDZD(priceTtc)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
