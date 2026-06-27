import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { SliderField } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function FormattingSectionControls({ tpl, update }: Props) {
  return (
    <>
      <div className="ps-field">
        <label className="ps-field-label">عرض الورق</label>
        <div className="ps-paper-pills" style={{ marginTop: 2 }}>
          {([80, 58] as const).map(w => (
            <button key={w} className={`ps-paper-pill ${tpl.paper_width_mm === w ? 'on' : ''}`}
              onClick={() => update('paper_width_mm', w)}>
              {w} mm
            </button>
          ))}
        </div>
      </div>

      <SliderField label="الهامش العلوي" value={tpl.margin_top} min={0} max={10} unit="mm"
        onChange={v => update('margin_top', v)} />
      <SliderField label="الهامش السفلي" value={tpl.margin_bottom} min={0} max={10} unit="mm"
        onChange={v => update('margin_bottom', v)} />
      <SliderField label="الهامش الجانبي" value={tpl.margin_sides} min={0} max={10} unit="mm"
        onChange={v => update('margin_sides', v)} />
      <SliderField label="تباعد الأسطر" value={tpl.line_spacing} min={1} max={2.5} step={0.1} unit="×"
        onChange={v => update('line_spacing', v)} />
      <SliderField label="حجم الخط الأساسي" value={tpl.base_font_size} min={8} max={14} unit="px"
        onChange={v => update('base_font_size', v)} />
    </>
  );
}
