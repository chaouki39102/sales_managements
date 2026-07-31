import { useState, type ReactNode } from 'react';
import type { PrintTemplate, BorderStyle } from '@/pages/settings/print-settings/types/domain';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
}

type ShowField =
  | 'show_logo'
  | 'show_company_name'
  | 'show_label_brand'
  | 'show_label_product_name'
  | 'show_label_ref'
  | 'show_label_price'
  | 'show_label_barcode'
  | 'show_label_product_image';

const ELEMENT_DEFS: { id: string; label: string; icon: string; field: ShowField }[] = [
  { id: 'logo', label: 'الشعار', icon: 'ti-photo', field: 'show_logo' },
  { id: 'company', label: 'اسم الشركة', icon: 'ti-building', field: 'show_company_name' },
  { id: 'brand', label: 'الماركة', icon: 'ti-trademark', field: 'show_label_brand' },
  { id: 'product_name', label: 'اسم المنتج', icon: 'ti-abc', field: 'show_label_product_name' },
  { id: 'ref', label: 'المرجع', icon: 'ti-hash', field: 'show_label_ref' },
  { id: 'price', label: 'السعر', icon: 'ti-coin', field: 'show_label_price' },
  { id: 'barcode', label: 'الباركود', icon: 'ti-barcode', field: 'show_label_barcode' },
  { id: 'image', label: 'الصورة', icon: 'ti-photo', field: 'show_label_product_image' },
];

const sect: React.CSSProperties = {
  padding: '8px 10px', marginBottom: 6,
  background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
};
const sectTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--t3)', marginBottom: 5,
  display: 'flex', alignItems: 'center', gap: 5,
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--t2)', minWidth: 65, flexShrink: 0,
};
const slider: React.CSSProperties = {
  flex: 1, height: 3, accentColor: 'var(--em)', cursor: 'pointer', minWidth: 0,
};
const sliderval: React.CSSProperties = {
  fontSize: 10, color: 'var(--t4)', minWidth: 24, textAlign: 'left', fontFamily: 'monospace',
};
const toggleStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0', cursor: 'pointer', userSelect: 'none', fontSize: 11.5, color: 'var(--t2)', fontWeight: 500,
};
const colorInput: React.CSSProperties = {
  width: 28, height: 24, border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', padding: 1,
};
const textInput: React.CSSProperties = {
  flex: 1, padding: '4px 6px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
  background: 'var(--bg2)', fontSize: 11, color: 'var(--t1)', outline: 'none', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box', minWidth: 0,
};
const pillBtn = (on: boolean): React.CSSProperties => ({
  flex: 1, padding: '3px 0', fontSize: 11, borderRadius: 'var(--r1)',
  border: `1px solid ${on ? 'var(--em)' : 'var(--b2)'}`,
  background: on ? 'var(--emb)' : 'transparent',
  color: on ? 'var(--em)' : 'var(--t3)', cursor: 'pointer', fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
});
const toggleTrack: React.CSSProperties = {
  width: 30, height: 16, borderRadius: 8, flexShrink: 0, position: 'relative',
  cursor: 'pointer', transition: 'background .16s',
};
const toggleKnob: React.CSSProperties = {
  position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%', background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .16s',
};

function Toggle({ value, onChange, label: lbl, muted }: { value: boolean; onChange: (v: boolean) => void; label: string; muted?: boolean }) {
  return (
    <div onClick={() => onChange(!value)} style={{ ...toggleStyle, opacity: muted ? 0.75 : 1 }}>
      <div style={{ ...toggleTrack, background: value ? 'var(--em)' : 'var(--bg5)', border: `1px solid ${value ? 'var(--embo)' : 'var(--b3)'}` }}>
        <div style={{ ...toggleKnob, left: value ? 14 : 2 }} />
      </div>
      <span>{lbl}</span>
    </div>
  );
}

function Slider({ label: lbl, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={row}>
      <span style={label}>{lbl}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={slider} />
      <span style={sliderval}>{value}{unit}</span>
    </div>
  );
}

function ColorPicker({ label: lbl, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const toFull = (h: string) => h.length === 4 && h[0] === '#'
    ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  return (
    <div style={row}>
      <span style={label}>{lbl}</span>
      <input type="color" value={toFull(value)} onChange={e => onChange(e.target.value)} style={colorInput} />
    </div>
  );
}

function Pills<T extends string>({ options, value, onChange }: {
  options: { v: T; l: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} type="button" style={pillBtn(value === o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

function Section({ icon, title, defaultOpen = true, children }: {
  icon: string; title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={sect}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ ...sectTitle, cursor: 'pointer', marginBottom: 0, userSelect: 'none' }}
        title={open ? 'طي القسم' : 'فتح القسم'}
      >
        <i className={icon} style={{ fontSize: 13, color: 'var(--em)' }} />
        <span style={{ flex: 1 }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 11, color: 'var(--t4)', transition: 'transform .15s' }} />
      </div>
      {open && <div style={{ marginTop: 5 }}>{children}</div>}
    </div>
  );
}

export default function StickerControls({ tpl, update, selectedElement, onSelectElement }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Elements Manager ── */}
      <Section icon="ti-layout-grid" title="العناصر" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ELEMENT_DEFS.map(def => {
            const isOn = !!tpl[def.field];
            const isSel = selectedElement === def.id;
            return (
              <div
                key={def.id}
                onClick={() => onSelectElement(isSel ? null : def.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                  borderRadius: 'var(--r1)', cursor: 'pointer',
                  border: `1px solid ${isSel ? 'var(--em)' : 'transparent'}`,
                  background: isSel ? 'var(--emb)' : isOn ? 'var(--bg2)' : 'transparent',
                  opacity: isOn ? 1 : 0.55,
                }}
                title={isOn ? `${def.label} — انقر للتحريك` : `${def.label} مخفي — انقر للتحريك`}
              >
                <i className={def.icon} style={{ fontSize: 13, color: isSel ? 'var(--em)' : 'var(--t3)', width: 16, textAlign: 'center' }} />
                <span style={{ flex: 1, fontSize: 11.5, fontWeight: isSel ? 800 : 600, color: isSel ? 'var(--em)' : 'var(--t2)' }}>
                  {def.label}
                </span>
                {isOn && (
                  <button type="button" title="تحديد في اللوحة"
                    onClick={(e) => { e.stopPropagation(); onSelectElement(def.id); }}
                    style={{
                      padding: '2px 5px', border: '1px solid var(--b2)', borderRadius: 4,
                      background: 'var(--bg3)', color: 'var(--em)', cursor: 'pointer', fontSize: 10,
                      lineHeight: 1, display: 'flex', alignItems: 'center',
                    }}>
                    <i className="ti ti-crosshair" />
                  </button>
                )}
                <div
                  onClick={(e) => { e.stopPropagation(); update(def.field, !tpl[def.field]); }}
                  style={{ ...toggleTrack, background: isOn ? 'var(--em)' : 'var(--bg5)', border: `1px solid ${isOn ? 'var(--embo)' : 'var(--b3)'}`, width: 26, height: 14, borderRadius: 7 }}
                >
                  <div style={{ ...toggleKnob, top: 1.5, width: 10, height: 10, left: isOn ? 13 : 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Company Name ── */}
      <Section icon="ti-building" title="اسم الشركة" defaultOpen>
        <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="عرض اسم الشركة" />
        {tpl.show_company_name && (
          <>
            <div style={row}>
              <span style={label}>النص</span>
              <input value={tpl.company_name_text ?? ''} onChange={e => update('company_name_text', e.target.value)} placeholder="اترك فارغاً لاستخدام اسم الشركة" style={textInput} />
            </div>
            <Slider label="الحجم" value={tpl.company_name_size} min={8} max={30} unit="px" onChange={v => update('company_name_size', v)} />
            <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
            <ColorPicker label="اللون" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
            <div style={row}>
              <span style={label}>المحاذاة</span>
              <Pills options={[{ v: 'right', l: 'يمين' }, { v: 'center', l: 'وسط' }, { v: 'left', l: 'يسار' }]} value={tpl.company_name_align} onChange={v => update('company_name_align', v)} />
            </div>
          </>
        )}
      </Section>

      {/* ── Product Name ── */}
      <Section icon="ti-abc" title="اسم المنتج" defaultOpen>
        <Toggle value={tpl.show_label_product_name} onChange={v => update('show_label_product_name', v)} label="عرض اسم المنتج" />
        {tpl.show_label_product_name && (
          <>
            <Slider label="الحجم" value={tpl.label_product_name_size} min={8} max={28} unit="px" onChange={v => update('label_product_name_size', v)} />
            <Toggle value={tpl.label_product_name_bold} onChange={v => update('label_product_name_bold', v)} label="خط عريض" />
            <ColorPicker label="اللون" value={tpl.label_product_name_color} onChange={v => update('label_product_name_color', v)} />
          </>
        )}
      </Section>

      {/* ── Price ── */}
      <Section icon="ti-coin" title="السعر" defaultOpen>
        <Toggle value={tpl.show_label_price} onChange={v => update('show_label_price', v)} label="عرض السعر" />
        {tpl.show_label_price && (
          <>
            <Slider label="الحجم" value={tpl.label_price_size} min={12} max={48} unit="px" onChange={v => update('label_price_size', v)} />
            <Toggle value={tpl.label_price_bold} onChange={v => update('label_price_bold', v)} label="خط عريض" />
            <ColorPicker label="اللون" value={tpl.label_price_color} onChange={v => update('label_price_color', v)} />
            <div style={row}>
              <span style={label}>العملة</span>
              <input value={tpl.label_price_text ?? 'د.ج'} onChange={e => update('label_price_text', e.target.value)} placeholder="د.ج" style={{ ...textInput, maxWidth: 80 }} />
            </div>
            <div style={row}>
              <span style={label}>بادئة</span>
              <input value={tpl.label_price_prefix ?? ''} onChange={e => update('label_price_prefix', e.target.value)} placeholder="فقط" style={{ ...textInput, maxWidth: 80 }} />
            </div>
            <Toggle value={tpl.label_hide_currency} onChange={v => update('label_hide_currency', v)} label="إخفاء نص العملة" />
          </>
        )}
      </Section>

      {/* ── Barcode ── */}
      <Section icon="ti-barcode" title="الباركود" defaultOpen>
        <Toggle value={tpl.show_label_barcode} onChange={v => update('show_label_barcode', v)} label="عرض الباركود" />
        {tpl.show_label_barcode && (
          <>
            <div style={row}>
              <span style={label}>النوع</span>
              <Pills options={[{ v: 'code39', l: 'Code 39' }, { v: 'ean13', l: 'EAN-13' }, { v: 'code128', l: 'Code 128' }]} value={tpl.label_barcode_format} onChange={v => update('label_barcode_format', v as 'code39' | 'ean13' | 'code128')} />
            </div>
            <Slider label="الارتفاع" value={tpl.label_barcode_height ?? 50} min={20} max={120} step={5} unit="px" onChange={v => update('label_barcode_height', v)} />
            <Slider label="العرض" value={tpl.label_barcode_bar_width ?? 1.0} min={0.5} max={3.0} step={0.25} unit="×" onChange={v => update('label_barcode_bar_width', v)} />
            <div style={{ marginTop: 2 }}>
              <Toggle
                value={tpl.label_barcode_show_text !== false}
                onChange={v => update('label_barcode_show_text', v)}
                label="إظهار الرقم أسفل الباركود"
              />
            </div>
          </>
        )}
      </Section>

      {/* ── Extra Options ── */}
      <Section icon="ti-adjustments-horizontal" title="خيارات إضافية" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* ── Brand ── */}
          <div style={sect}>
            <div style={sectTitle}><i className="ti ti-trademark" style={{ fontSize: 13 }} />الماركة</div>
            <Toggle value={tpl.show_label_brand} onChange={v => update('show_label_brand', v)} label="عرض الماركة" />
            {tpl.show_label_brand && (
              <>
                <Slider label="الحجم" value={tpl.label_brand_size} min={6} max={16} unit="px" onChange={v => update('label_brand_size', v)} />
                <ColorPicker label="اللون" value={tpl.label_brand_color} onChange={v => update('label_brand_color', v)} />
              </>
            )}
          </div>

          {/* ── Reference ── */}
          <div style={sect}>
            <div style={sectTitle}><i className="ti ti-hash" style={{ fontSize: 13 }} />المرجع</div>
            <Toggle value={tpl.show_label_ref} onChange={v => update('show_label_ref', v)} label="عرض المرجع" />
            {tpl.show_label_ref && (
              <>
                <Slider label="الحجم" value={tpl.label_ref_size} min={6} max={14} unit="px" onChange={v => update('label_ref_size', v)} />
                <ColorPicker label="اللون" value={tpl.label_ref_color} onChange={v => update('label_ref_color', v)} />
              </>
            )}
          </div>

          {/* ── Product Image ── */}
          <div style={sect}>
            <div style={sectTitle}><i className="ti ti-photo" style={{ fontSize: 13 }} />صورة المنتج</div>
            <Toggle value={tpl.show_label_product_image} onChange={v => update('show_label_product_image', v)} label="عرض الصورة" />
            {tpl.show_label_product_image && (
              <Slider label="الحجم" value={tpl.label_product_image_size} min={20} max={80} step={2} unit="px" onChange={v => update('label_product_image_size', v)} />
            )}
          </div>

          {/* ── Layout ── */}
          <div style={sect}>
            <div style={sectTitle}><i className="ti ti-layout" style={{ fontSize: 13 }} />التخطيط</div>
            <div style={row}>
              <span style={label}>اتجاه العرض</span>
              <Pills options={[{ v: 'stacked', l: 'عمودي' }, { v: 'side-by-side', l: 'جنباً' }]} value={tpl.label_layout} onChange={v => update('label_layout', v as 'stacked' | 'side-by-side')} />
            </div>
          </div>

          {/* ── Border ── */}
          <div style={sect}>
            <div style={sectTitle}><i className="ti ti-border-all" style={{ fontSize: 13 }} />الحدود</div>
            <div style={row}>
              <span style={label}>النمط</span>
              <select value={tpl.label_border_style || 'solid'} onChange={e => update('label_border_style', e.target.value as BorderStyle)} style={textInput}>
                <option value="solid">خط متصل</option>
                <option value="dashed">خط متقطع</option>
                <option value="double">خط مزدوج</option>
                <option value="none">بدون</option>
              </select>
            </div>
            <Slider label="السُمك" value={tpl.label_border_width ?? 1} min={0} max={5} step={0.5} unit="px" onChange={v => update('label_border_width', v)} />
            <Slider label="التدوير" value={tpl.label_border_radius ?? 4} min={0} max={20} unit="px" onChange={v => update('label_border_radius', v)} />
            <ColorPicker label="اللون" value={tpl.label_border_color || '#333333'} onChange={v => update('label_border_color', v)} />
          </div>
        </div>
      </Section>
    </div>
  );
}
