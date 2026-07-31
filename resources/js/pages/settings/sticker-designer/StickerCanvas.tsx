import { useRef, useCallback, type MouseEvent } from 'react';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import { printFieldResolver } from '@/pages/settings/print-settings/services';
import { fontFamily } from '@/pages/settings/print-settings/components/preview/shared';
import { renderLogo } from '@/pages/settings/print-settings/components/preview/LogoRenderer';
import { buildBarcode } from '@/lib/barcodeRenderer';

const W = 320;
const H = 160;

interface ElementDef {
  id: string;
  label: string;
  visible: (tpl: PrintTemplate, data: UniversalDocumentData) => boolean;
  render: (tpl: PrintTemplate, data: UniversalDocumentData) => React.ReactNode;
}

const ELEMENTS: ElementDef[] = [
  {
    id: 'logo', label: 'الشعار',
    visible: (tpl) => tpl.show_logo,
    render: (tpl, data) => {
      if (!tpl.show_logo) return null;
      const logo = renderLogo(tpl, data);
      if (!logo) return null;
      return <div style={{ textAlign: 'center' }}>{logo}</div>;
    },
  },
  {
    id: 'company', label: 'اسم الشركة',
    visible: (tpl, data) => {
      if (!tpl.show_company_name) return false;
      const name = tpl.company_name_text || (printFieldResolver.resolve('company.name', data, tpl) as string) || '';
      return !!name;
    },
    render: (tpl) => {
      if (!tpl.show_company_name) return null;
      return (
        <div style={{
          fontSize: tpl.company_name_size ?? 14,
          fontWeight: tpl.company_name_bold ? 700 : 400,
          color: tpl.company_name_color || '#111',
          lineHeight: 1.2, textAlign: tpl.company_name_align || 'center',
          whiteSpace: 'nowrap',
        }}>
          {tpl.company_name_text || 'اسم الشركة'}
        </div>
      );
    },
  },
  {
    id: 'brand', label: 'الماركة',
    visible: (tpl, data) => tpl.show_label_brand && !!(data.lines[0] as any)?.brand,
    render: (tpl, data) => {
      if (!tpl.show_label_brand) return null;
      const brand = (data.lines[0] as any)?.brand as string;
      if (!brand) return null;
      return (
        <div style={{
          fontSize: tpl.label_brand_size ?? 7,
          color: tpl.label_brand_color || '#888',
          lineHeight: 1.1, textAlign: 'center',
        }}>
          {brand}
        </div>
      );
    },
  },
  {
    id: 'product_name', label: 'اسم المنتج',
    visible: (tpl, data) => tpl.show_label_product_name && !!(data.lines[0] as any)?.name,
    render: (tpl, data) => {
      if (!tpl.show_label_product_name) return null;
      const name = (data.lines[0] as any)?.name as string;
      if (!name) return null;
      return (
        <div style={{
          fontSize: tpl.label_product_name_size ?? 16,
          fontWeight: tpl.label_product_name_bold ? 700 : 400,
          color: tpl.label_product_name_color || '#111',
          lineHeight: 1.25, textAlign: 'center',
          padding: '0 4px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
      );
    },
  },
  {
    id: 'ref', label: 'المرجع',
    visible: (tpl, data) => tpl.show_label_ref && !!(data.lines[0] as any)?.ref,
    render: (tpl, data) => {
      if (!tpl.show_label_ref) return null;
      const ref = (data.lines[0] as any)?.ref as string;
      if (!ref) return null;
      return (
        <div style={{
          fontSize: tpl.label_ref_size ?? 9,
          color: tpl.label_ref_color || '#666',
          textAlign: 'center',
        }}>
          {ref}
        </div>
      );
    },
  },
  {
    id: 'price', label: 'السعر',
    visible: (tpl) => tpl.show_label_price,
    render: (tpl, data) => {
      if (!tpl.show_label_price) return null;
      const price = (data.lines[0] as any)?.unitPriceTtc ?? (data.lines[0] as any)?.unitPriceHt ?? 0;
      const isNumber = typeof price === 'number' && Number.isFinite(price);
      const displayPrice = isNumber ? price.toFixed(2) : String(price ?? '0.00');
      const prefix = tpl.label_price_prefix || '';
      const text = tpl.label_price_text || 'DA';
      const hideCurrency = !!tpl.label_hide_currency;
      return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center' }}>
          {prefix && (
            <span style={{
              fontSize: Math.max(10, (tpl.label_price_size ?? 24) * 0.45),
              color: tpl.label_price_color || '#c0392b',
            }}>{prefix}</span>
          )}
          <span style={{
            fontSize: tpl.label_price_size ?? 24,
            fontWeight: tpl.label_price_bold ? 800 : 500,
            color: tpl.label_price_color || '#c0392b',
            lineHeight: 1.1, direction: 'ltr',
          }}>{displayPrice}</span>
          {!hideCurrency && (
            <span style={{
              fontSize: Math.max(10, (tpl.label_price_size ?? 24) * 0.45),
              color: tpl.label_price_color || '#c0392b', fontWeight: 600,
            }}>{text}</span>
          )}
        </div>
      );
    },
  },
  {
    id: 'barcode', label: 'الباركود',
    visible: (tpl, data) => tpl.show_label_barcode && !!(data.lines[0] as any)?.barcode,
    render: (tpl, data) => {
      if (!tpl.show_label_barcode) return null;
      const barcodeValue = (data.lines[0] as any)?.barcode as string;
      if (!barcodeValue) return null;
      const format = tpl.label_barcode_format || 'code39';
      const height = tpl.label_barcode_height ?? 50;
      const barWidth = tpl.label_barcode_bar_width ?? 1.0;
      if (format === 'code128') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{
              fontFamily: "'Libre Barcode 128'", fontSize: Math.max(height, 30),
              lineHeight: 1, color: '#111', direction: 'ltr',
            }}>
              {barcodeValue}
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, letterSpacing: 1, color: '#666', direction: 'ltr' }}>
              {(format as string) === 'ean13'
                ? `${barcodeValue[0]} ${barcodeValue.slice(1, 7)} ${barcodeValue.slice(7)}`
                : barcodeValue}
            </div>
          </div>
        );
      }
      const bc = buildBarcode(barcodeValue, format, barWidth);
      if (!bc) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <svg width={`${bc.totalWidth.toFixed(2)}px`} height={height}
            viewBox={`0 0 ${bc.totalWidth.toFixed(2)} ${height}`}
            style={{ direction: 'ltr', display: 'block' }}>
            {bc.bars.map((bar, i) => (
              <rect key={i} x={bar.x} y={0} width={bar.width} height={height} fill="#111" />
            ))}
          </svg>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, letterSpacing: 1, color: '#666', direction: 'ltr' }}>
            {barcodeValue}
          </div>
        </div>
      );
    },
  },
  {
    id: 'image', label: 'الصورة',
    visible: (tpl, data) => tpl.show_label_product_image && !!(data.lines[0] as any)?.imageUrl,
    render: (tpl, data) => {
      if (!tpl.show_label_product_image) return null;
      const url = (data.lines[0] as any)?.imageUrl as string;
      if (!url) return null;
      const size = tpl.label_product_image_size ?? 40;
      return (
        <img src={url} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
      );
    },
  },
];

const _SEP = { id: 'separator', label: 'فاصل' }; void _SEP;

export type SelectedElement = string | null;

interface Props {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  selected: SelectedElement;
  onSelect: (id: SelectedElement) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

export default function StickerCanvas({ tpl, data, selected, onSelect, onPositionChange }: Props) {
  const dragRef = useRef<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pos = tpl.label_positions ?? {};

  const onMouseDown = useCallback((e: MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = pos[id] || { x: 0, y: 0 };
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      elX: p.x,
      elY: p.y,
    };
    const onMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const nx = Math.max(0, Math.min(W - 10, dragRef.current.elX + dx));
      const ny = Math.max(0, Math.min(H - 10, dragRef.current.elY + dy));
      onPositionChange(dragRef.current.id, nx, ny);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos, onSelect, onPositionChange]);

  const visible = ELEMENTS.filter(el => el.visible(tpl, data));

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: W, height: H, direction: 'rtl',
          fontFamily: fontFamily(tpl.font_family),
          fontSize: tpl.base_font_size ?? 12,
          background: '#fff',
          borderRadius: 2, overflow: 'hidden',
          border: '1px solid var(--b3)',
          position: 'relative',
          userSelect: 'none',
        }}
        onClick={() => onSelect(null)}
      >
        {visible.map(el => {
          const p = pos[el.id] || { x: 0, y: 0 };
          const isSelected = selected === el.id;
          return (
            <div
              key={el.id}
              onMouseDown={(e) => onMouseDown(e, el.id)}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                cursor: 'grab',
                outline: isSelected ? '2px dashed var(--em)' : '2px solid transparent',
                outlineOffset: 1,
                borderRadius: 2,
                padding: '1px 2px',
                background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                minWidth: 20, minHeight: 10,
              }}
            >
              {el.render(tpl, data)}
            </div>
          );
        })}
      </div>
      {/* عنصر التوجيه للفاصل — يظهر خارج الكانفاس عند تحديده */}
    </div>
  );
}


