import {
  useRef, useCallback, useEffect, useMemo, useState,
  type PointerEvent as ReactPointerEvent, type CSSProperties,
} from 'react';
import Moveable, {
  type OnResize, type OnResizeEnd,
  type OnRotate, type OnRotateEnd,
} from 'react-moveable';
import type { PrintTemplate, StickerElementGeometry } from '@/pages/settings/print-settings/types/domain';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import { printFieldResolver } from '@/pages/settings/print-settings/services';
import { fontFamily } from '@/pages/settings/print-settings/components/preview/shared';
import { renderLogo } from '@/pages/settings/print-settings/components/preview/LogoRenderer';
import { buildBarcode } from '@/lib/barcodeRenderer';
import { toolBtnStyle } from '@/pages/settings/print-settings/components/TinyBtn';

const W = 320;
const H = 160;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

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

const round1 = (v: number) => Math.round(v * 10) / 10;

export type SelectedElement = string | null;

interface Props {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  selected: SelectedElement;
  onSelect: (id: SelectedElement) => void;
  onTransformChange: (id: string, pos: StickerElementGeometry) => void;
}

export default function StickerCanvas({ tpl, data, selected, onSelect, onTransformChange }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizeStartRef = useRef<{ startW: number; startH: number; startScale: number } | null>(null);
  const suppressResizeRef = useRef(false);
  const dragRef = useRef<{ id: string; startX: number; startY: number; elX: number; elY: number; elW: number; elH: number } | null>(null);
  const moveableRef = useRef<React.ElementRef<typeof Moveable>>(null);
  const moveableGestureRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [livePos, setLivePos] = useState<Record<string, StickerElementGeometry>>({});
  const livePosRef = useRef<Record<string, StickerElementGeometry>>({});

  const savedPos = useMemo(() => tpl.label_positions ?? {}, [tpl.label_positions]);

  useEffect(() => {
    livePosRef.current = {};
    setLivePos({});
  }, [tpl.label_positions]);

  useEffect(() => {
    if (!selected || moveableGestureRef.current) return;
    moveableRef.current?.updateRect();
  }, [livePos, selected]);

  const getPos = useCallback((id: string): StickerElementGeometry =>
    livePos[id] ?? savedPos[id] ?? { x: 0, y: 0 }, [livePos, savedPos]);

  const applyLive = useCallback((id: string, patch: Partial<StickerElementGeometry>) => {
    livePosRef.current = {
      ...livePosRef.current,
      [id]: { ...(livePosRef.current[id] ?? savedPos[id] ?? { x: 0, y: 0 }), ...patch },
    };
    setLivePos(livePosRef.current);
  }, [savedPos]);

  const commitLive = useCallback((id: string) => {
    const p = livePosRef.current[id];
    if (!p) return;
    onTransformChange(id, { ...p });
  }, [onTransformChange]);

  // ── Drag (manual pointer drag — single gesture, zoom-aware, no jumping) ──
  const onElementPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    const p = getPos(id);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      elX: p.x ?? 0,
      elY: p.y ?? 0,
      elW: e.currentTarget.offsetWidth,
      elH: e.currentTarget.offsetHeight,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, [onSelect, getPos]);

  const onElementPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    const maxX = Math.max(0, W - d.elW);
    const maxY = Math.max(0, H - d.elH);
    applyLive(id, {
      x: Math.round(Math.max(0, Math.min(maxX, d.elX + dx))),
      y: Math.round(Math.max(0, Math.min(maxY, d.elY + dy))),
    });
  }, [zoom, applyLive]);

  const onElementPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    commitLive(id);
  }, [commitLive]);

  // ── Resize ────────────────────────────────────────────────────────────────
  const handleResizeStart = useCallback(() => {
    const id = selected;
    if (!id || suppressResizeRef.current) return;
    moveableGestureRef.current = true;
    const cur = getPos(id);
    const el = elementRefs.current[id];
    resizeStartRef.current = {
      startW: cur.width ?? el?.offsetWidth ?? 40,
      startH: cur.height ?? el?.offsetHeight ?? 16,
      startScale: cur.scale ?? 1,
    };
  }, [selected, getPos]);

  const handleResize = useCallback((e: OnResize) => {
    const id = selected;
    const info = resizeStartRef.current;
    if (!id || !info || suppressResizeRef.current) return;
    const dw = Math.abs(e.width - info.startW);
    const dh = Math.abs(e.height - info.startH);
    const ratio = dh >= dw && info.startH > 0
      ? e.height / info.startH
      : (info.startW > 0 ? e.width / info.startW : 1);
    const scale = Math.max(0.1, Math.min(10, info.startScale * ratio));
    applyLive(id, {
      x: Math.round(e.drag.beforeTranslate[0]),
      y: Math.round(e.drag.beforeTranslate[1]),
      width: Math.max(4, Math.round(e.width)),
      height: Math.max(4, Math.round(e.height)),
      scale: round1(scale),
    });
  }, [selected, applyLive]);

  const handleResizeEnd = useCallback((e: OnResizeEnd) => {
    moveableGestureRef.current = false;
    const id = selected;
    if (id && e.isDrag) commitLive(id);
    resizeStartRef.current = null;
  }, [selected, commitLive]);

  // ── Rotate ────────────────────────────────────────────────────────────────
  const handleRotateStart = useCallback(() => {
    suppressResizeRef.current = true;
    moveableGestureRef.current = true;
  }, []);

  const handleRotate = useCallback((e: OnRotate) => {
    const id = selected;
    if (!id) return;
    applyLive(id, { rotate: Math.round(e.rotate) });
  }, [selected, applyLive]);

  const handleRotateEnd = useCallback((e: OnRotateEnd) => {
    suppressResizeRef.current = false;
    moveableGestureRef.current = false;
    const id = selected;
    if (id && e.isDrag) commitLive(id);
  }, [selected, commitLive]);

  const visible = ELEMENTS.filter(el => el.visible(tpl, data));
  const targetEl = selected ? (elementRefs.current[selected] ?? null) : null;
  const otherEls = visible
    .filter(el => el.id !== selected)
    .map(el => elementRefs.current[el.id])
    .filter((el): el is HTMLDivElement => !!el);

  const zoomBtn: CSSProperties = { ...toolBtnStyle, padding: '3px 9px', fontSize: 12, lineHeight: 1 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" title="تصغير"
          onClick={() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          style={zoomBtn}>
          <i className="ti ti-zoom-out" />
        </button>
        <span style={{
          fontSize: 11, minWidth: 44, textAlign: 'center', color: 'var(--t3)',
          fontFamily: 'monospace', fontWeight: 700,
        }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" title="تكبير"
          onClick={() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          style={zoomBtn}>
          <i className="ti ti-zoom-in" />
        </button>
        <button type="button" title="إعادة الضبط 100%"
          onClick={() => setZoom(1)}
          style={zoomBtn}>
          <i className="ti ti-frame" />
        </button>
        <button type="button" title={snapEnabled ? 'التصاق: مفعّل' : 'التصاق: معطّل'}
          onClick={() => setSnapEnabled(s => !s)}
          style={{
            ...zoomBtn,
            color: snapEnabled ? 'var(--em)' : 'var(--t3)',
            boxShadow: snapEnabled ? 'var(--emglow)' : 'none',
          }}>
          <i className={snapEnabled ? 'ti-magnet' : 'ti-magnet-off'} />
        </button>
      </div>

      <div style={{ width: W * zoom, height: H * zoom, position: 'relative' }}>
        <div
          ref={stageRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `scale(${zoom})`, transformOrigin: 'top left',
          }}
        >
          <div
            ref={canvasRef}
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
            onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
          >
            {visible.map(el => {
              const p = getPos(el.id);
              const isSelected = selected === el.id;
              const style: CSSProperties = {
                position: 'absolute',
                left: p.x,
                top: p.y,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxSizing: 'border-box', cursor: 'grab', touchAction: 'none',
                outline: isSelected ? '2px dashed var(--em)' : '2px solid transparent',
                outlineOffset: 1, borderRadius: 2, padding: '1px 2px',
                background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                minWidth: 4, minHeight: 4,
              };
              if (p.width !== undefined) style.width = p.width;
              if (p.height !== undefined) style.height = p.height;
              if (p.rotate) style.transform = `rotate(${p.rotate}deg)`;
              return (
                <div
                  key={el.id}
                  ref={(node) => {
                    if (node) elementRefs.current[el.id] = node;
                    else delete elementRefs.current[el.id];
                  }}
                  onPointerDown={(e) => onElementPointerDown(e, el.id)}
                  onPointerMove={(e) => onElementPointerMove(e, el.id)}
                  onPointerUp={(e) => onElementPointerUp(e, el.id)}
                  onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}
                  style={style}
                >
                  <div style={{
                    transform: p.scale && p.scale !== 1 ? `scale(${p.scale})` : undefined,
                    transformOrigin: 'center',
                  }}>
                    {el.render(tpl, data)}
                  </div>
                </div>
              );
            })}
          </div>

          {targetEl && (
            <Moveable
              ref={moveableRef}
              container={stageRef.current ?? undefined}
              target={targetEl}
              zoom={zoom}
              origin={false}
              resizable
              keepRatio={false}
              onResizeStart={handleResizeStart}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
              rotatable
              rotationPosition="top"
              onRotateStart={handleRotateStart}
              onRotate={handleRotate}
              onRotateEnd={handleRotateEnd}
              snappable={snapEnabled}
              snapThreshold={5}
              snapHorizontal={snapEnabled ? [0, H / 2, H] : undefined}
              snapVertical={snapEnabled ? [0, W / 2, W] : undefined}
              elementGuidelines={snapEnabled ? otherEls : undefined}
              bounds={{ left: 0, top: 0, right: W, bottom: H }}
              snapContainer={canvasRef.current ?? undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
