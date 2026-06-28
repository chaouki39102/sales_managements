// resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx
import React from 'react';

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="ps-toggle">
      <div className={`ps-toggle-track ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <div className="ps-toggle-thumb" />
      </div>
      <span className="ps-toggle-label">{label}</span>
    </label>
  );
}

export function SliderField({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="ps-slider-field">
      <div className="ps-slider-header">
        <span className="ps-slider-label">{label}</span>
        <span className="ps-slider-val">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="ps-range" />
    </div>
  );
}

export function Section({ title, icon, children, defaultOpen = true, id, collapseVersion }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; id?: string; collapseVersion?: number;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setOpen(defaultOpen);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseVersion]);
  return (
    <div className="ps-section" id={id}>
      <button className="ps-section-head" onClick={() => setOpen(o => !o)}>
        <i className={`ti ${icon}`} />
        <span>{title}</span>
        <i className={`ti ti-chevron-down ps-section-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <div ref={bodyRef} className="ps-section-body">{children}</div>}
    </div>
  );
}

export function ColorToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Toggle value={value} onChange={onChange} label={label} />;
}
