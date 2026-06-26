// resources/js/pages/settings/print-settings/sections/FormattingSection.tsx
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { SliderField, Section } from './ToggleSwitch';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function FormattingSectionControls({ tpl, update }: Props) {
  return (
    <Section title="تنسيق الطباعة — الهوامش والمسافات" icon="ti-settings">
      {/* Paper width */}
      <div className="ps-field">
        <label className="ps-field-label">عرض الورق</label>
        <div className="ps-paper-pills" style={{ marginTop: 2 }}>
          {([80, 58] as const).map(w => (
            <button key={w} className={`ps-paper-pill ${tpl.paperWidth === w ? 'on' : ''}`}
              onClick={() => update('paperWidth', w)}>
              {w} mm
            </button>
          ))}
        </div>
      </div>

      <SliderField label="الهامش العلوي" value={tpl.marginTop} min={0} max={10} unit="mm"
        onChange={v => update('marginTop', v)} />
      <SliderField label="الهامش السفلي" value={tpl.marginBottom} min={0} max={10} unit="mm"
        onChange={v => update('marginBottom', v)} />
      <SliderField label="الهامش الجانبي" value={tpl.marginSides} min={0} max={10} unit="mm"
        onChange={v => update('marginSides', v)} />
      <SliderField label="تباعد الأسطر" value={tpl.lineSpacing} min={1} max={2.5} step={0.1} unit="×"
        onChange={v => update('lineSpacing', v)} />
      <SliderField label="حجم الخط الأساسي" value={tpl.baseFontSize} min={8} max={14} unit="px"
        onChange={v => update('baseFontSize', v)} />
    </Section>
  );
}
