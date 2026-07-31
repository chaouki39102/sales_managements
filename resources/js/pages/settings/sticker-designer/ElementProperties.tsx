import type { CSSProperties } from 'react';
import type { PrintTemplate, StickerElementGeometry } from '@/pages/settings/print-settings/types/domain';
import { ELEMENT_META } from './StickerCanvas';

const CANVAS_W = 320;
const CANVAS_H = 160;

interface Props {
  elementId: string;
  geometry: StickerElementGeometry;
  tpl: PrintTemplate;
  hasCustomPosition: boolean;
  onGeometryChange: (id: string, pos: StickerElementGeometry) => void;
  onRemovePosition: (id: string) => void;
  onTemplateChange: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  onDeselect: () => void;
}

const sect: CSSProperties = {
  padding: '8px 10px', marginBottom: 6,
  background: 'var(--emb)',
  borderRadius: 'var(--r2)', border: '1px solid var(--embo)',
};
const groupTitle: CSSProperties = {
  fontSize: 10, fontWeight: 800, color: 'var(--t3)', margin: '8px 0 3px',
  display: 'flex', alignItems: 'center', gap: 4,
};
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
};
const label: CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--t2)', minWidth: 44, flexShrink: 0,
};
const numInput: CSSProperties = {
  width: 64, padding: '3px 6px', borderRadius: 'var(--r1)',
  border: '1px solid var(--b2)', background: 'var(--bg2)',
  fontSize: 11, color: 'var(--t1)', outline: 'none',
  fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box',
};
const smallBtn: CSSProperties = {
  padding: '3px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
  background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer',
  fontSize: 10.5, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
};
const actionBtn: CSSProperties = {
  flex: 1, padding: '4px 0', borderRadius: 'var(--r1)', border: '1px solid var(--embo)',
  background: 'var(--bg2)', color: 'var(--em)', cursor: 'pointer',
  fontSize: 10.5, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
};
const dangerBtn: CSSProperties = {
  ...actionBtn,
  borderColor: 'var(--redbo)', color: 'var(--red)', background: 'var(--redb)',
};
const alignBtn = (on: boolean): CSSProperties => ({
  flex: 1, padding: '4px 0', borderRadius: 'var(--r1)', cursor: 'pointer',
  fontSize: 12, lineHeight: 1, fontFamily: 'Tajawal, sans-serif',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${on ? 'var(--em)' : 'var(--b2)'}`,
  background: on ? 'var(--emb)' : 'var(--bg2)',
  color: on ? 'var(--em)' : 'var(--t3)',
  boxShadow: on ? 'var(--emglow)' : 'none',
});
const alignRowLabel: CSSProperties = {
  fontSize: 10, fontWeight: 800, color: 'var(--t3)', minWidth: 34, flexShrink: 0,
};

const H_ALIGNS: { v: 'left' | 'center' | 'right'; icon: string; title: string }[] = [
  { v: 'right', icon: 'ti-align-right', title: 'محاذاة لليمين' },
  { v: 'center', icon: 'ti-align-center', title: 'توسيط' },
  { v: 'left', icon: 'ti-align-left', title: 'محاذاة لليسار' },
];
const V_ALIGNS: { v: 'top' | 'middle' | 'bottom'; icon: string; title: string }[] = [
  { v: 'top', icon: 'ti-align-box-top-center', title: 'محاذاة للأعلى' },
  { v: 'middle', icon: 'ti-align-box-center-middle', title: 'توسيط عمودي' },
  { v: 'bottom', icon: 'ti-align-box-bottom-center', title: 'محاذاة للأسفل' },
];
const toggleStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0',
  cursor: 'pointer', userSelect: 'none', fontSize: 11.5,
  color: 'var(--t2)', fontWeight: 500,
};
const toggleTrack: CSSProperties = {
  width: 30, height: 16, borderRadius: 8, flexShrink: 0, position: 'relative',
  cursor: 'pointer', transition: 'background .16s',
};
const toggleKnob: CSSProperties = {
  position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%',
  background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .16s',
};

export default function ElementProperties({
  elementId, geometry, tpl, hasCustomPosition, onGeometryChange, onRemovePosition, onTemplateChange, onDeselect,
}: Props) {
  const meta = ELEMENT_META[elementId] ?? { label: elementId, icon: 'ti-box' };
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const rotate = geometry.rotate ?? 0;
  const w = geometry.width;
  const h = geometry.height;
  const scale = geometry.scale ?? 1;

  const setNum = (key: 'x' | 'y' | 'rotate' | 'width' | 'height', raw: string) => {
    if (raw === '' || raw === '-') return;
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    onGeometryChange(elementId, { ...geometry, [key]: v });
  };

  const centerX = () => {
    onGeometryChange(elementId, { ...geometry, x: Math.round(CANVAS_W / 2), align: 'center' });
  };

  const centerY = () => {
    onGeometryChange(elementId, { ...geometry, y: Math.round(CANVAS_H / 2), valign: 'middle' });
  };

  const resetAll = () => {
    onGeometryChange(elementId, { x: 0, y: 0, width: undefined, height: undefined, rotate: 0, scale: 1, align: undefined, valign: undefined });
  };

  const toggleVal = tpl.label_barcode_show_text !== false;

  const currentAlign = geometry.align ?? 'left';
  const currentValign = geometry.valign ?? 'top';

  return (
    <div style={sect}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: 'var(--em)', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <i className={`ti ${meta.icon}`} style={{ fontSize: 13 }} />
        <span style={{ flex: 1 }}>{meta.label}</span>
        <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 600, fontFamily: 'monospace' }}>
          {x}, {y}
        </span>
        <button type="button" title="إغلاق"
          onClick={onDeselect}
          style={{ ...smallBtn, borderColor: 'transparent', background: 'transparent', color: 'var(--t4)', fontSize: 12, padding: '0 3px' }}>
          <i className="ti ti-x" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>X</span>
          <input type="number" min={0} max={CANVAS_W} step={1} value={x}
            onChange={e => setNum('x', e.target.value)} style={numInput} />
        </div>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>Y</span>
          <input type="number" min={0} max={CANVAS_H} step={1} value={y}
            onChange={e => setNum('y', e.target.value)} style={numInput} />
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
          <span style={alignRowLabel}>أفقي</span>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {H_ALIGNS.map(a => (
              <button key={a.v} type="button" title={a.title}
                onClick={() => onGeometryChange(elementId, { ...geometry, align: a.v })}
                style={alignBtn(currentAlign === a.v)}>
                <i className={`ti ${a.icon}`} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
          <span style={alignRowLabel}>عمودي</span>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {V_ALIGNS.map(a => (
              <button key={a.v} type="button" title={a.title}
                onClick={() => onGeometryChange(elementId, { ...geometry, valign: a.v })}
                style={alignBtn(currentValign === a.v)}>
                <i className={`ti ${a.icon}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, margin: '4px 0' }}>
        <button type="button" title="توسيط أفقياً" onClick={centerX} style={actionBtn}>
          <i className="ti ti-align-center" style={{ fontSize: 11 }} />
        </button>
        <button type="button" title="توسيط عمودياً" onClick={centerY} style={actionBtn}>
          <i className="ti ti-arrows-vertical" style={{ fontSize: 11 }} />
        </button>
        <button type="button" title="إعادة الضبط (الزاوية العلوية)" onClick={resetAll} style={actionBtn}>
          <i className="ti ti-corner-up-left" style={{ fontSize: 11 }} />
        </button>
        {hasCustomPosition && (
          <button type="button" title="حذف التخصيص والعودة إلى التخطيط الافتراضي" onClick={() => onRemovePosition(elementId)} style={dangerBtn}>
            <i className="ti ti-trash" style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      <div style={groupTitle}>
        <i className="ti ti-dimensions" style={{ fontSize: 11 }} />القياس
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>عرض</span>
          <input type="number" min={4} max={CANVAS_W} step={1} value={w ?? ''} placeholder="تلقائي"
            onChange={e => setNum('width', e.target.value)} style={numInput} />
        </div>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>ارتفاع</span>
          <input type="number" min={4} max={CANVAS_H} step={1} value={h ?? ''} placeholder="تلقائي"
            onChange={e => setNum('height', e.target.value)} style={numInput} />
        </div>
      </div>
      <div style={row}>
        <span style={label}>تكبير</span>
        <input type="range" min={10} max={300} step={5} value={Math.round(scale * 100)}
          onChange={e => onGeometryChange(elementId, { ...geometry, scale: Math.round(Number(e.target.value)) / 100 })}
          style={{ flex: 1, height: 3, accentColor: 'var(--em)', cursor: 'pointer' }} />
        <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 32, textAlign: 'left', fontFamily: 'monospace' }}>
          {Math.round(scale * 100)}%
        </span>
        {scale !== 1 && (
          <button type="button" title="إعادة التكبير إلى 100%" onClick={() => onGeometryChange(elementId, { ...geometry, scale: 1 })} style={smallBtn}>
            <i className="ti ti-rotate-360" style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      <div style={groupTitle}>
        <i className="ti ti-rotate" style={{ fontSize: 11 }} />الدوران
      </div>
      <div style={row}>
        <span style={label}>الزاوية</span>
        <input type="number" min={-180} max={180} step={1} value={rotate}
          onChange={e => setNum('rotate', e.target.value)} style={numInput} />
        <span style={{ fontSize: 9.5, color: 'var(--t4)', flex: 1 }}>0 = الافتراضي</span>
        <button type="button" title="إرجاع إلى 0"
          onClick={() => onGeometryChange(elementId, { ...geometry, rotate: 0 })} style={smallBtn}>
          <i className="ti ti-rotate-360" style={{ fontSize: 12 }} />
        </button>
      </div>

      {elementId === 'barcode' && (
        <div onClick={() => onTemplateChange('label_barcode_show_text', !toggleVal)}
          style={{ ...toggleStyle, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--embo)' }}>
          <div style={{
            ...toggleTrack,
            background: toggleVal ? 'var(--em)' : 'var(--bg5)',
            border: `1px solid ${toggleVal ? 'var(--embo)' : 'var(--b3)'}`,
          }}>
            <div style={{ ...toggleKnob, left: toggleVal ? 14 : 2 }} />
          </div>
          <span>إظهار الرقم أسفل الباركود</span>
        </div>
      )}
    </div>
  );
}
