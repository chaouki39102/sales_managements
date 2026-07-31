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
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { formatDZD } from '@/pos/utils/calculations';
import type { ProductVariant, Family } from '@/types';

interface Props {
  open:        boolean;
  variants:    ProductVariant[];
  families:    Family[];
  cartCount:   number;
  onAdd:       (variant: ProductVariant) => void;
  onClose:     () => void;
}

function StockBadge({ v }: { v: ProductVariant }) {
  if (!v.manages_stock) return null;
  const stock = v.current_stock ?? 0;
  const cls = stock <= 0 ? 'pp-badge pp-badge--out' : (stock <= 5 ? 'pp-badge pp-badge--low' : 'pp-badge pp-badge--ok');
  const label = stock <= 0 ? 'نفد المخزون' : `متوفر: ${stock}`;
  return <span className={cls}>{label}</span>;
}

export default function POSProProductDrawer({
  open, variants, families, cartCount, onAdd, onClose,
}: Props) {
  const [query, setQuery]     = useState('');
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [scanInput, setScanInput] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

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
    return [...list].sort((a, b) =>
      (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ar'),
    );
  }, [variants, familyId, query]);

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
      onAdd(hit);
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

        {/* الشبكة */}
        <div className="pp-grid">
          {filtered.map(v => {
            const tvaRate = v.tva?.rate ?? 0;
            const priceTtc = v.default_selling_price_ht * (1 + tvaRate / 100);
            const img = (v as any).image_url ?? v.product?.default_image ?? v.product?.images?.[0] ?? null;
            return (
              <button
                key={v.id}
                type="button"
                className="pp-card"
                onClick={() => onAdd(v)}
              >
                <div className="pp-card-img">
                  {img ? <img src={img} alt="" loading="lazy" /> : <i className="ti ti-package" />}
                </div>
                <div className="pp-card-name">{v.product?.name ?? ''}</div>
                <div className="pp-card-ref">{v.ref || v.barcode || ''}</div>
                <div className="pp-card-price">{formatDZD(priceTtc)}</div>
                <div className="pp-card-bottom">
                  <StockBadge v={v} />
                  <span className="pp-card-ht">{formatDZD(v.default_selling_price_ht)}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="pp-empty">
              <i className="ti ti-search-off" />
              <span>لا توجد منتجات مطابقة</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
