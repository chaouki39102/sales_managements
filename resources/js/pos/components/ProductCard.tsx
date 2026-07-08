// pos/components/ProductCard.tsx
//
// النسخة الفعلية الوحيدة المُستخدَمة من ProductGrid (عرض grid فقط —
// عرض الجدول/القائمة list-view له بنية مختلفة تماماً ويبقى داخل
// ProductGrid.tsx كجدول <table>).
//
// تحديث "بطاقات احترافية + صور متجاوبة بمقاس موحّد":
// - ارتفاع صورة البطاقة أصبح ثابتاً وموحّداً عبر متغيّر CSS
//   (--pcard-img-h المضبوط في .pgrid/.pgrid--xs/--sm/--lg) بدل
//   aspect-ratio المتغيّر، فلم تعد الصور تظهر بمقاسات متفاوتة
//   بين البطاقات مهما اختلفت أبعاد الصورة الأصلية.
// - object-fit: cover + object-position: center يضمنان قصّ الصورة
//   بشكل متناسق دون تشويه.
// - عند فشل تحميل رابط الصورة (رابط معطوب/404) نتراجع تلقائياً
//   لعرض أيقونة العائلة بدل مربع مكسور.
import React, { useState } from 'react';
import type { ProductVariant, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';

interface ProductCardProps {
  variant:               ProductVariant;
  /** فهرس العنصر داخل القائمة الحالية — يُستخدم للتنقل بلوحة المفاتيح (data-hl-idx) */
  idx:                   number;
  qtyInCart:             number;
  highlighted:           boolean;
  isPinned:              boolean;
  priceLevels:           PriceLevel[];
  selectedPriceLevelId:  number | null;
  allowNegativeStock?:   boolean;
  onAdd:                 (v: ProductVariant) => void;
  onPin:                 (v: ProductVariant) => void;
  /** يُستدعى عند أي تفاعل مع البطاقة (كليك) لمزامنة مؤشر التنقل بلوحة المفاتيح */
  onHighlight?:          (idx: number) => void;
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
  onAdd,
  onPin,
  onHighlight,
}: ProductCardProps) {
  const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const tvaRate  = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);

  const stock         = v.current_stock;
  const unknownStock  = stock === undefined;
  const outStock      = isVariantOutOfStock(v, allowNegativeStock);
  const lowStock      = v.manages_stock && !unknownStock && (stock ?? 0) > 0 && (stock ?? 0) <= (v.min_stock_alert ?? 0);
  const lastPiece     = v.manages_stock && !unknownStock && (stock ?? 0) > 0 && (stock ?? 0) <= 2 && !lowStock;

  const style = familyStyleFromName(v.product?.family?.name ?? '');
  const imageUrl = (v as unknown as { image_url?: string }).image_url;

  // تراجع تلقائي لعرض الأيقونة عند فشل تحميل الصورة (رابط معطوب/404)
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;

  const handleClick = () => {
    if (!outStock) onAdd(v);
    onHighlight?.(idx);
  };

  return (
    <div
      data-hl-idx={idx}
      className={`pcard ${outStock ? 'pcard-out' : ''} ${qtyInCart > 0 ? 'pcard-incart' : ''} ${highlighted ? 'pcard-hl' : ''}`}
      onClick={handleClick}
      title={v.product?.name}
    >
      <div className="pcard-img" style={!showImage ? { background: style.bg } : undefined}>
        {showImage
          ? (
            <img
              src={imageUrl}
              alt={v.product?.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          )
          : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
        }
        {qtyInCart > 0 && <span className="pcard-in-cart">{qtyInCart}</span>}
        {outStock && <span className="pcard-out-badge">نفذ</span>}
        {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
        {lastPiece && <span className="pcard-last-badge">آخر قطعة</span>}
      </div>

      <div className="pcard-body">
        <div className="pcard-name">{v.product?.name}</div>
        {v.barcode && <div className="pcard-bc">{v.barcode}</div>}

        <div className="pcard-prices">
          <span className="pcard-ttc">{formatDZD(priceTtc)}</span>
          {tvaRate > 0 && (
            <span className="pcard-ht">HT: {formatDZD(priceHt)}</span>
          )}
        </div>

        {v.manages_stock && !unknownStock && (
          <div className={`pcard-stock ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>
            <i className={`ti ti-${outStock ? 'alert-circle' : lowStock ? 'alert-triangle' : 'package'}`} />
            {outStock ? 'نفذ المخزون' : `${stock} ${v.unit?.abbreviation ?? ''}`}
          </div>
        )}
        {v.manages_stock && unknownStock && (
          <div className="pcard-stock na">
            <i className="ti ti-minus" />—
          </div>
        )}
      </div>

      <div className="pcard-actions" onClick={e => e.stopPropagation()}>
        <button
          className={`pcard-pin ${isPinned ? 'on' : ''}`}
          onClick={() => onPin(v)}
          title={isPinned ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <i className={`ti ti-star${isPinned ? '-filled' : ''}`} />
        </button>
        <button
          className="pcard-add"
          onClick={() => !outStock && onAdd(v)}
          disabled={outStock}
          title="إضافة للسلة"
        >
          <i className="ti ti-plus" />
        </button>
      </div>
    </div>
  );
}
