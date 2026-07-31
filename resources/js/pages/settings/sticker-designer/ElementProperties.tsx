import type { CSSProperties } from 'react';
import type { PrintTemplate, StickerElementGeometry } from '@/pages/settings/print-settings/types/domain';
import { ELEMENT_META } from './StickerCanvas';

interface Props {
  elementId: string;
  geometry: StickerElementGeometry;
  tpl: PrintTemplate;
  onGeometryChange: (id: string, pos: StickerElementGeometry) => void;
  onTemplateChange: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  onDeselect: () => void;
}

const sect: CSSProperties = {
  padding: '8px 10px', marginBottom: 6,
  background: 'var(--emb)',
  borderRadius: 'var(--r2)', border: '1px solid var(--embo)',
};
const sectTitle: CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--em)', marginBottom: 5,
  display: 'flex', alignItems: 'center', gap: 5,
};
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
};
const label: CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--t2)', minWidth: 52, flexShrink: 0,
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
  elementId, geometry, tpl, onGeometryChange, onTemplateChange, onDeselect,
}: Props) {
  const meta = ELEMENT_META[elementId] ?? { label: elementId, icon: 'ti-box' };
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const rotate = geometry.rotate ?? 0;

  const setNum = (key: 'x' | 'y' | 'rotate', raw: string) => {
    if (raw === '' || raw === '-') return;
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    onGeometryChange(elementId, { ...geometry, [key]: v });
  };

  const reset = (key: 'x' | 'y' | 'rotate', def: number) => {
    onGeometryChange(elementId, { ...geometry, [key]: def });
  };

  return (
    <div style={sect}>
      <div style={sectTitle}>
        <i className={meta.icon} style={{ fontSize: 13 }} />
        <span style={{ flex: 1 }}>{meta.label}</span>
        <button type="button" title="إغلاق"
          onClick={onDeselect}
          style={{ ...smallBtn, borderColor: 'transparent', background: 'transparent', color: 'var(--t4)', fontSize: 12, padding: '0 3px' }}>
          <i className="ti ti-x" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>X</span>
          <input type="number" min={0} max={320} step={1} value={x}
            onChange={e => setNum('x', e.target.value)} style={numInput} />
        </div>
        <div style={{ ...row, flex: 1 }}>
          <span style={label}>Y</span>
          <input type="number" min={0} max={160} step={1} value={y}
            onChange={e => setNum('y', e.target.value)} style={numInput} />
        </div>
      </div>

      <div style={row}>
        <span style={label}>الدوران</span>
        <input type="number" min={-180} max={180} step={1} value={rotate}
          onChange={e => setNum('rotate', e.target.value)} style={numInput} />
        <span style={{ fontSize: 9.5, color: 'var(--t4)', flex: 1 }}>0 = القيمة الافتراضية</span>
        <button type="button" title="إرجاع إلى 0"
          onClick={() => reset('rotate', 0)} style={smallBtn}>
          <i className="ti ti-rotate-360" style={{ fontSize: 12 }} />
        </button>
      </div>

      {elementId === 'barcode' && (
        <div onClick={() => onTemplateChange('label_barcode_show_text', !(tpl.label_barcode_show_text !== false))}
          style={toggleStyle}>
          <div style={{
            ...toggleTrack,
            background: tpl.label_barcode_show_text !== false ? 'var(--em)' : 'var(--bg5)',
            border: `1px solid ${tpl.label_barcode_show_text !== false ? 'var(--embo)' : 'var(--b3)'}`,
          }}>
            <div style={{ ...toggleKnob, left: tpl.label_barcode_show_text !== false ? 14 : 2 }} />
          </div>
          <span>إظهار الرقم أسفل الباركود</span>
        </div>
      )}
    </div>
  );
}
