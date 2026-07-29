import React, { useState, useRef, useCallback } from 'react';
import type { PrintTemplate, DocumentLine, CompanyData } from '@/pages/settings/print-settings/types/data';
import { buildBarcode } from './barcodeUtils';

const LABEL_W = 320;
const LABEL_H = 160;
const SCALE = 2.8;

interface DragItem {
  id: string;
  startY: number;
  elStart: number;
}

const ELEMENTS_ORDER: { id: string; label: string }[] = [
  { id: 'brand', label: 'العلامة التجارية' },
  { id: 'productName', label: 'اسم المنتج' },
  { id: 'ref', label: 'المرجع' },
  { id: 'price', label: 'السعر' },
  { id: 'logo', label: 'الشعار' },
  { id: 'companyName', label: 'اسم الشركة' },
  { id: 'image', label: 'صورة المنتج' },
  { id: 'barcode', label: 'الباركود' },
];

interface Props {
  template: PrintTemplate;
  line: DocumentLine;
  company: CompanyData | null;
  onUpdate: (patch: Partial<PrintTemplate>) => void;
  onSelectElement?: (id: string | null) => void;
}

export default function StickerCanvas({ template, line, company, onUpdate, onSelectElement }: Props) {
  const [drag, setDrag] = useState<DragItem | null>(null);
  const dragRef = useRef<DragItem | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const product = line;
  const companyName = template.company_name_text || company?.name || '';
  const productName = product.name || '';
  const barcodeValue = product.barcode || '';
  const price = product.unitPriceTtc ?? product.unitPriceHt ?? 0;
  const ref = product.ref || '';
  const brandName = (product as any).brand || '';
  const imageUrl = (product as any).imageUrl || '';
  const pricePrefix = template.label_price_prefix || '';
  const priceText = template.label_price_text || 'د.ج';
  const isNumber = typeof price === 'number' && Number.isFinite(price);
  const displayPrice = isNumber ? price.toFixed(2) : String(price ?? '0.00');
  const barcodeFormat = template.label_barcode_format || 'code39';
  const barcode = template.show_label_barcode && barcodeValue ? buildBarcode(barcodeValue, barcodeFormat) : null;
  const hideCurrency = !!template.label_hide_currency;
  const isSideBySide = template.label_layout === 'side-by-side';
  const imgSize = template.label_product_image_size ?? 40;
  const showImg = template.show_label_product_image && imageUrl;
  const pad = template.margin_sides ?? 8;
  const padT = template.margin_top ?? 6;
  const padB = template.margin_bottom ?? 6;

  const getPos = (id: string): number => {
    const key = `_stk_${id}_y` as keyof PrintTemplate;
    return (template[key] as number | undefined) ?? 0;
  };

  const setPos = useCallback((id: string, y: number) => {
    const key = `_stk_${id}_y` as keyof PrintTemplate;
    onUpdate({ [key]: Math.max(0, Math.min(LABEL_H - 24, y)) } as any);
  }, [onUpdate]);

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const elTop = getPos(id) * SCALE;
    const item: DragItem = { id, startY: e.clientY, elStart: elTop };
    dragRef.current = item;
    setDrag(item);

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = ev.clientY - d.startY;
      const newRaw = Math.max(0, Math.min(LABEL_H - 24, (d.elStart + dy) / SCALE));
      setPos(d.id, Math.round(newRaw));
    };

    const onUp = () => {
      dragRef.current = null;
      setDrag(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [getPos, setPos]);

  const visibleElements = ELEMENTS_ORDER.filter(el => {
    switch (el.id) {
      case 'brand': return template.show_label_brand && brandName;
      case 'productName': return template.show_label_product_name && productName;
      case 'ref': return template.show_label_ref && ref;
      case 'price': return template.show_label_price;
      case 'logo': return template.show_logo;
      case 'companyName': return template.show_company_name && companyName;
      case 'image': return template.show_label_product_image && imageUrl;
      case 'barcode': return template.show_label_barcode && barcodeValue;
      default: return true;
    }
  });

  const bs = template.label_border_style || 'solid';
  const bw = template.label_border_width ?? 1;
  const bc = template.label_border_color || '#333';
  const br = template.label_border_radius ?? 4;
  const ff = template.font_family || 'tajawal';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        ref={canvasRef}
        id="sticker-canvas"
        style={{
          position: 'relative',
          width: LABEL_W * SCALE,
          height: LABEL_H * SCALE,
          background: '#fff',
          border: `${bw * SCALE}px ${bs === 'none' ? 'solid' : bs} ${bc}`,
          borderRadius: br * SCALE,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          cursor: drag ? 'grabbing' : 'default',
          direction: 'rtl',
          fontFamily: ff,
        }}
      >
        {visibleElements.map(el => {
          const top = getPos(el.id) * SCALE;
          const isDragging = drag?.id === el.id;

          return (
            <div
              key={el.id}
              id={`stk-el-${el.id}`}
              onMouseDown={(e) => { onSelectElement?.(el.id); handleMouseDown(el.id, e); }}
              onClick={() => onSelectElement?.(el.id)}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                padding: '2px 6px',
                cursor: 'grab',
                userSelect: 'none',
                zIndex: isDragging ? 100 : 1,
                opacity: isDragging ? 0.85 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                flexWrap: 'wrap',
                lineHeight: 1.2,
                fontSize: 11 * SCALE,
              }}
            >
              {renderElement(el.id, template, {
                productName, brandName, ref, displayPrice, pricePrefix, priceText,
                hideCurrency, barcode, barcodeValue, companyName, imageUrl, showImg,
                imgSize, isSideBySide, pad, padT, padB, ff, bs, bw, bc, br, SCALE,
              })}
            </div>
          );
        })}

        {drag && (
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: getPos(drag.id) * SCALE + (LABEL_H * SCALE - getPos(drag.id) * SCALE > 6 ? 0 : -4),
            height: 4, background: '#3b82f6', opacity: 0.5, zIndex: 99,
            pointerEvents: 'none',
          }} />
        )}
      </div>
      <div style={{ fontSize: 11, color: '#888' }}>
        اسحب العناصر بالماوس لتغيير موضعها على الملصق
      </div>
    </div>
  );
}

function renderElement(
  id: string,
  tpl: PrintTemplate,
  ctx: {
    productName: string; brandName: string; ref: string;
    displayPrice: string; pricePrefix: string; priceText: string;
    hideCurrency: boolean; barcode: any; barcodeValue: string;
    companyName: string; imageUrl: string; showImg: boolean;
    imgSize: number; isSideBySide: boolean;
    pad: number; padT: number; padB: number; ff: string;
    bs: string; bw: number; bc: string; br: number; SCALE: number;
  },
) {
  const s = ctx.SCALE;
  switch (id) {
    case 'brand':
      return (
        <span style={{
          fontSize: (tpl.label_brand_size ?? 7) * s * 0.9, color: tpl.label_brand_color || '#888',
          textAlign: 'center',
        }}>{ctx.brandName}</span>
      );
    case 'productName':
      return (
        <span style={{
          fontSize: (tpl.label_product_name_size ?? 9) * s * 0.9,
          fontWeight: tpl.label_product_name_bold ? 700 : 400,
          color: tpl.label_product_name_color || '#111',
          textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: '90%',
        }}>{ctx.productName}</span>
      );
    case 'ref':
      return (
        <span style={{
          fontSize: (tpl.label_ref_size ?? 6) * s * 0.9, color: tpl.label_ref_color || '#666',
          textAlign: 'center',
        }}>{ctx.ref}</span>
      );
    case 'price':
      return (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 * s * 0.3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ctx.pricePrefix && (
            <span style={{ fontSize: (tpl.label_price_size ?? 14) * s * 0.4, color: tpl.label_price_color || '#c0392b' }}>
              {ctx.pricePrefix}
            </span>
          )}
          <span style={{
            fontSize: (tpl.label_price_size ?? 14) * s * 0.9,
            fontWeight: tpl.label_price_bold ? 800 : 500,
            color: tpl.label_price_color || '#c0392b',
            direction: 'ltr',
          }}>
            {ctx.displayPrice}
          </span>
          {!ctx.hideCurrency && (
            <span style={{ fontSize: (tpl.label_price_size ?? 14) * s * 0.4, color: tpl.label_price_color || '#c0392b', fontWeight: 600 }}>
              {ctx.priceText}
            </span>
          )}
        </span>
      );
    case 'logo':
      return (
        <div style={{ width: (tpl.logo_size ?? 50) * s * 0.3, height: (tpl.logo_size ?? 50) * s * 0.3, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 * s }}>
          🏢
        </div>
      );
    case 'companyName':
      return (
        <span style={{
          fontSize: (tpl.company_name_size ?? 9) * s * 0.9,
          fontWeight: tpl.company_name_bold ? 700 : 400,
          color: tpl.company_name_color || '#1a1a2e',
          textAlign: 'center',
        }}>{ctx.companyName || 'شركتي'}</span>
      );
    case 'image':
      return ctx.showImg ? (
        <div style={{
          width: ctx.imgSize * s * 0.3, height: ctx.imgSize * s * 0.3,
          background: '#e0e0e0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10 * s,
        }}>🖼</div>
      ) : null;
    case 'barcode':
      return ctx.barcode ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 * s * 0.1 }}>
          <svg
            width={`${(ctx.barcode.totalWidth * 0.25 * s * 0.5).toFixed(1)}px`}
            height={(tpl.label_barcode_height ?? 20) * s * 0.45}
            viewBox={`0 0 ${ctx.barcode.totalWidth * 0.25} ${tpl.label_barcode_height ?? 20}`}
            style={{ direction: 'ltr', display: 'block' }}
          >
            {ctx.barcode.bars.map((bar: any, i: number) => (
              <rect key={i} x={bar.x * 0.25} y={0} width={bar.w * 0.25} height={tpl.label_barcode_height ?? 20} fill="#111" />
            ))}
          </svg>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 6 * s * 0.6, color: '#666', direction: 'ltr' }}>
            {ctx.barcodeValue}
          </span>
        </div>
      ) : null;
    default:
      return null;
  }
}
