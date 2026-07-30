import { useState } from 'react';
import type { PrintTemplate, BorderStyle } from '@/pages/settings/print-settings/types/domain';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

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

function Toggle({ value, onChange, label: lbl }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div onClick={() => onChange(!value)} style={toggleStyle}>
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

export default function StickerControls({ tpl, update }: Props) {
  const [showExtra, setShowExtra] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Company Name ── */}
      <div style={sect}>
        <div style={sectTitle}><i className="ti ti-building" style={{ fontSize: 13 }} />اسم الشركة</div>
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
      </div>

      {/* ── Product Name ── */}
      <div style={sect}>
        <div style={sectTitle}><i className="ti ti-abc" style={{ fontSize: 13 }} />اسم المنتج</div>
        <Toggle value={tpl.show_label_product_name} onChange={v => update('show_label_product_name', v)} label="عرض اسم المنتج" />
        {tpl.show_label_product_name && (
          <>
            <Slider label="الحجم" value={tpl.label_product_name_size} min={8} max={28} unit="px" onChange={v => update('label_product_name_size', v)} />
            <Toggle value={tpl.label_product_name_bold} onChange={v => update('label_product_name_bold', v)} label="خط عريض" />
            <ColorPicker label="اللون" value={tpl.label_product_name_color} onChange={v => update('label_product_name_color', v)} />
          </>
        )}
      </div>

      {/* ── Price ── */}
      <div style={sect}>
        <div style={sectTitle}><i className="ti ti-coin" style={{ fontSize: 13 }} />السعر</div>
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
      </div>

      {/* ── Barcode ── */}
      <div style={sect}>
        <div style={sectTitle}><i className="ti ti-barcode" style={{ fontSize: 13 }} />الباركود</div>
        <Toggle value={tpl.show_label_barcode} onChange={v => update('show_label_barcode', v)} label="عرض الباركود" />
        {tpl.show_label_barcode && (
          <>
            <div style={row}>
              <span style={label}>النوع</span>
              <Pills options={[{ v: 'code39', l: 'Code 39' }, { v: 'ean13', l: 'EAN-13' }, { v: 'code128', l: 'Code 128' }]} value={tpl.label_barcode_format} onChange={v => update('label_barcode_format', v as 'code39' | 'ean13' | 'code128')} />
            </div>
            <Slider label="الارتفاع" value={tpl.label_barcode_height ?? 50} min={20} max={120} step={5} unit="px" onChange={v => update('label_barcode_height', v)} />
            <Slider label="العرض" value={tpl.label_barcode_bar_width ?? 1.0} min={0.5} max={3.0} step={0.25} unit="×" onChange={v => update('label_barcode_bar_width', v)} />
          </>
        )}
      </div>

      {/* ── Extra Options ── */}
      <button onClick={() => setShowExtra(e => !e)} type="button"
        style={{
          padding: '6px 10px', marginBottom: 6, borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: showExtra ? 'var(--emb)' : 'var(--bg3)',
          cursor: 'pointer', fontSize: 11, fontWeight: 700, color: showExtra ? 'var(--em)' : 'var(--t3)',
          fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 5,
        }}>
        <i className={`ti ti-chevron-${showExtra ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
        {showExtra ? 'إخفاء الخيارات الإضافية' : 'خيارات إضافية'}
      </button>

      {showExtra && (
        <>
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
        </>
      )}
    </div>
  );
}
