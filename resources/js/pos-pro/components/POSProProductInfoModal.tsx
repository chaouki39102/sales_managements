// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProProductInfoModal.tsx
//
// نافذة معلومات المنتج (تفتح من بطاقة المنتج في مودال اختيار المنتجات:
// ضغطة مطوّلة 500ms أو زر "i"):
//  • صورة + اسم المنتج + اسم الخيار + المرجع + الباركود
//  • تفاصيل: العائلة، العلامة، الوحدة، نسبة TVA، المخزون، سعر HT/TTC
//  • اختيار التغليف (عند وجود أكثر من تغليفة) — السعر يتبع التغليفة
//  • قائمة الخصومات الكمية الفعّالة
//  • تبديل الخيارات (مشاهدة واختيار بين كل خيارات المنتج دون مغادرة النافذة)
//  • الوصف (إن وجد) + زر إضافة للسلة مع محدد الكمية
//
// نفس منطق تسعير بطاقة المنتج تماماً (getVariantPrice × تغليفة) حتى يبقى
// السعر المعروض هو ما يُضاف فعلياً.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatDZD } from '@/pos/utils/calculations';
import { getVariantPrice, isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ProductVariant, ProductPackaging, PriceLevel } from '@/types';
import type { PriceDisplayMode } from '@/pos/hooks/usePOSSettings';

interface Props {
  open: boolean;
  variant: ProductVariant;
  /** كل خيارات نفس المنتج (للتبديل داخل النافذة) */
  siblings: ProductVariant[];
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  priceDisplayMode: PriceDisplayMode;
  allowNegativeStock: boolean;
  /** الوحدات الموجودة في السلة لكل خيار (لحساب المخزون المتبقي) */
  qtyInCartById?: Map<number, number>;
  onAdd: (variant: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
  onClose: () => void;
}

function activeDiscounts(v: ProductVariant) {
  return (v.quantity_discounts ?? [])
    .filter(d => d.active !== false)
    .sort((a, b) => (a.min_qty ?? 0) - (b.min_qty ?? 0));
}

/** سعر الإضافة الفعلي لخيار (سعر الوحدة × تغليفته الافتراضية) — مطابق تماماً
 *  لسلوك التبديل حتى يكون سعر الخيار المعروض هو ما يُضاف فعلياً. */
function addPriceFor(
  s: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  const base = getVariantPrice(s, priceLevelId, priceLevels);
  const pkgs = (s.packagings ?? (s.product as any)?.packagings ?? [])
    .filter((p: ProductPackaging) => p.active !== false);
  const def = pkgs.find((p: ProductPackaging) => p.is_default) ?? pkgs[0] ?? null;
  return base * (def ? Math.max(1, Number(def.quantity) || 1) : 1);
}

export default function POSProProductInfoModal({
  open, variant, siblings, priceLevels, selectedPriceLevelId,
  priceDisplayMode, allowNegativeStock, qtyInCartById, onAdd, onClose,
}: Props) {
  const [activeVariant, setActiveVariant] = useState<ProductVariant>(variant);
  useEffect(() => { setActiveVariant(variant); }, [variant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = activeVariant;
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(1); }, [v.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── تغذية راجعة فورية بعد الإضافة (بدون إغلاق النافذة) ─────────────────────
  const [justAdded, setJustAdded] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (addTimerRef.current) clearTimeout(addTimerRef.current); }, []);

  // ── التغليف (نفس منطق بطاقة المنتج) ─────────────────────────────────────────
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

  // ── التسعير ────────────────────────────────────────────────────────────────
  const priceHtBase = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const priceHt     = priceHtBase * packQty;
  const tvaRate     = v.tva?.rate ?? 0;
  const priceTtc    = priceHt * (1 + tvaRate / 100);
  const isLevelPriced = selectedPriceLevelId != null && priceHtBase !== v.default_selling_price_ht;
  const primary   = priceDisplayMode === 'ht' ? priceHt : priceTtc;

  const outStock  = isVariantOutOfStock(v, allowNegativeStock);
  const inCartUnits = qtyInCartById?.get(v.id as number) ?? 0;
  const stock     = v.current_stock ?? 0;
  const remaining = Math.max(0, stock - inCartUnits);

  const discounts = useMemo(() => activeDiscounts(v), [v.quantity_discounts]);
  const img = v.image_url ?? (v.product as any)?.default_image ?? null;

  const familyName = v.product?.family?.name;
  const brandName  = v.product?.brand?.name;
  const variantLabel = v.variant_name?.trim();

  const switchVariant = (s: ProductVariant) => {
    if (s.id === v.id) return;
    setActiveVariant(s);
    setQty(1);
  };

  const handleAdd = () => {
    if (outStock || qty <= 0) return;
    onAdd(v, qty, activePkg);
    setJustAdded(true);
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    addTimerRef.current = setTimeout(() => setJustAdded(false), 900);
  };

  const stockCls = outStock ? 'pp-badge pp-badge--out'
    : (v.manages_stock && remaining <= 5) ? 'pp-badge pp-badge--low'
    : 'pp-badge pp-badge--ok';
  const stockLabel = !v.manages_stock ? 'بدون إدارة مخزون'
    : outStock ? 'نفد المخزون'
    : `المتاح: ${remaining}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="معلومات المنتج"
      subtitle={v.product?.name ?? ''}
      size="md"
      resizable={false}
      footer={
        <div className="pp-info-add">
          <div className="pp-info-qty">
            <button type="button" className="pp-info-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={outStock} title="تقليل">
              <i className="ti ti-minus" />
            </button>
            <input
              className="pp-info-qty-val"
              value={qty}
              inputMode="numeric"
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setQty(Number.isFinite(n) ? Math.max(1, n) : 1);
              }}
              disabled={outStock}
            />
            <button type="button" className="pp-info-qty-btn" onClick={() => setQty(q => q + 1)} disabled={outStock} title="زيادة">
              <i className="ti ti-plus" />
            </button>
          </div>
          <button
            type="button"
            className={`btn btn-p${justAdded ? ' ok' : ''}`}
            onClick={handleAdd}
            disabled={outStock}
          >
            <i className={justAdded ? 'ti ti-check' : 'ti ti-shopping-cart-plus'} />
            {justAdded ? 'تمت الإضافة' : 'إضافة إلى السلة'}
          </button>
        </div>
      }
    >
      <div className="pp-info">
        <div className="pp-info-top">
          <div className="pp-info-img">
            {img ? <img src={img} alt="" loading="lazy" /> : <i className="ti ti-package" />}
          </div>
          <div className="pp-info-main">
            <div className="pp-info-name">{v.product?.name}</div>
            {variantLabel && <div className="pp-info-sub-variant">{variantLabel}</div>}
            <div className="pp-info-refs">
              {v.ref && <span><i className="ti ti-hash" /> {v.ref}</span>}
              {v.barcode && <span><i className="ti ti-barcode" /> {v.barcode}</span>}
            </div>
            <div className="pp-info-price">
              <span className={isLevelPriced ? 'pp-info-price-lvl' : ''}>{formatDZD(primary)}</span>
              <span className="pp-info-price-unit">
                {priceDisplayMode === 'ht'
                  ? `دج HT (TTC ${formatDZD(priceTtc)})`
                  : `دج TTC (HT ${formatDZD(priceHt)})`}
              </span>
            </div>
            <span className={stockCls}>{stockLabel}</span>
            {inCartUnits > 0 && (
              <span className="pp-info-incart"><i className="ti ti-shopping-cart" /> في السلة: {inCartUnits}</span>
            )}
          </div>
        </div>

        <div className="pp-info-grid">
          {familyName && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-folder" /> العائلة</span>
              <span className="pp-info-cell-v">{familyName}</span>
            </div>
          )}
          {brandName && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-tag" /> العلامة</span>
              <span className="pp-info-cell-v">{brandName}</span>
            </div>
          )}
          {v.unit?.abbreviation && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-ruler" /> الوحدة</span>
              <span className="pp-info-cell-v">{v.unit.abbreviation}</span>
            </div>
          )}
          {v.tva && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-percentage" /> TVA</span>
              <span className="pp-info-cell-v">{v.tva.rate}%</span>
            </div>
          )}
          {v.manages_stock && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-box" /> المخزون</span>
              <span className="pp-info-cell-v">{stock} {v.unit?.abbreviation ?? ''}</span>
            </div>
          )}
          {v.min_stock_alert > 0 && (
            <div className="pp-info-cell">
              <span className="pp-info-cell-l"><i className="ti ti-alert-triangle" /> تنبيه النقص</span>
              <span className="pp-info-cell-v">{v.min_stock_alert}</span>
            </div>
          )}
        </div>

        {showPkgSel && (
          <div className="pp-info-row">
            <span className="pp-info-cell-l"><i className="ti ti-box-multiple" /> التغليف</span>
            <select
              className="pp-info-pkg"
              value={activePkg?.id ?? ''}
              onChange={(e) => setSelectedPkgId(Number(e.target.value))}
            >
              {packagings.map((p: ProductPackaging) => (
                <option key={p.id} value={p.id}>
                  {p.label}{p.quantity > 1 ? ` (${p.quantity})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {discounts.length > 0 && (
          <div className="pp-info-row pp-info-discs">
            <span className="pp-info-cell-l"><i className="ti ti-ticket" /> الخصومات الكمية</span>
            <div className="pp-info-disc-list">
              {discounts.map((d, i) => (
                <span key={i} className="pp-info-disc">
                  من {d.min_qty}:
                  {d.discount_percentage != null && d.discount_percentage > 0
                    ? ` -${d.discount_percentage}%`
                    : d.discount_amount != null && d.discount_amount > 0
                      ? ` -${formatDZD(d.discount_amount)}`
                      : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {v.product?.description && (
          <div className="pp-info-row pp-info-desc">
            <span className="pp-info-cell-l"><i className="ti ti-notes" /> الوصف</span>
            <p>{v.product.description}</p>
          </div>
        )}

        {siblings.length > 1 && (
          <div className="pp-info-row pp-info-variants">
            <span className="pp-info-cell-l"><i className="ti ti-variable" /> الخيارات ({siblings.length})</span>
            <div className="pp-info-variant-list">
              {siblings.map(s => {
                const sPrice = addPriceFor(s, selectedPriceLevelId, priceLevels);
                const sActive = s.id === v.id;
                const sOut = isVariantOutOfStock(s, allowNegativeStock);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`pp-info-variant${sActive ? ' on' : ''}${sOut ? ' off' : ''}`}
                    onClick={() => switchVariant(s)}
                    disabled={sOut}
                    title={sOut ? 'نفد المخزون' : undefined}
                  >
                    <span className="pp-info-variant-n">{s.variant_name?.trim() || s.ref || s.product?.name}</span>
                    <span className="pp-info-variant-p">{formatDZD(sPrice)}</span>
                    {sOut && <span className="pp-info-variant-oos">نفد</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
