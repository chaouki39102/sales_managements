import React from 'react';
import type { FontFamily } from '../types';
import type { PrintTemplate } from '../types';
import { SliderField } from './ToggleSwitch';
import { Field, Select, Pills } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function FormattingSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';

  return (
    <>
      {sec('paper_width_mm') && isThermal && (
        <div className="ps-field">
          <label className="ps-field-label">عرض الورق (حراري)</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {([80, 58] as const).map(w => (
              <button key={w} className={`ps-paper-pill ${tpl.paper_width_mm === w ? 'on' : ''}`}
                onClick={() => update('paper_width_mm', w)}>
                {w} mm
              </button>
            ))}
          </div>
        </div>
      )}

      {!isThermal && sec('page_orientation') && (
        <Field label="اتجاه الصفحة">
          <Pills
            options={[{ v: 'portrait' as const, l: 'عمودي' }, { v: 'landscape' as const, l: 'أفقي' }]}
            value={tpl.page_orientation}
            onChange={v => update('page_orientation', v)}
          />
        </Field>
      )}

      {sec('margin_top') && <SliderField label="الهامش العلوي" value={tpl.margin_top} min={0} max={10} unit="mm"
        onChange={v => update('margin_top', v)} />}
      {sec('margin_bottom') && <SliderField label="الهامش السفلي" value={tpl.margin_bottom} min={0} max={10} unit="mm"
        onChange={v => update('margin_bottom', v)} />}
      {sec('margin_sides') && <SliderField label="الهامش الجانبي" value={tpl.margin_sides} min={0} max={10} unit="mm"
        onChange={v => update('margin_sides', v)} />}
      {sec('line_spacing') && <SliderField label="تباعد الأسطر" value={tpl.line_spacing} min={1} max={2.5} step={0.1} unit="×"
        onChange={v => update('line_spacing', v)} />}
      {sec('base_font_size') && <SliderField label="حجم الخط الأساسي" value={tpl.base_font_size} min={8} max={14} unit="px"
        onChange={v => update('base_font_size', v)} />}

      {sec('font_family') && <Field label="نوع الخط الأساسي">
        <Select value={tpl.font_family} onChange={v => update('font_family', v as FontFamily)}>
          <option value="tajawal">Tajawal — عربي</option>
          <option value="monospace">Courier — أحادي</option>
          <option value="arial">Arial — لاتيني</option>
          <option value="times">Times New Roman</option>
        </Select>
      </Field>}
    </>
  );
}
