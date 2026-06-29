import React from 'react';
import type { AlignOption, BorderStyle } from '../types';

export const styledInput: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  fontSize: 12, color: 'var(--t1)', outline: 'none',
  fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box',
};

// ── Toggle ────────────────────────────────────────────────────────────────────

export const Toggle = React.memo(function Toggle({
  value, onChange, label,
}: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', cursor: 'pointer', userSelect: 'none',
    }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 34, height: 18, borderRadius: 9, flexShrink: 0,
          background: value ? 'var(--em)' : 'var(--bg5)',
          border: '1px solid ' + (value ? 'var(--embo)' : 'var(--b3)'),
          position: 'relative', cursor: 'pointer', transition: 'background .16s, border-color .16s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, width: 12, height: 12,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
          left: value ? 16 : 2, transition: 'left .16s',
        }} />
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500, lineHeight: 1.4 }}>{label}</span>
    </label>
  );
});

// ── Slider ────────────────────────────────────────────────────────────────────

export const Slider = React.memo(function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ margin: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--t2)', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step ?? 1}
        value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 4, accentColor: 'var(--em)', cursor: 'pointer' }}
      />
    </div>
  );
});

// ── Field ─────────────────────────────────────────────────────────────────────

export function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ margin: '2px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--t4)' }}>({hint})</span>}
      </div>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({ value, onChange, placeholder, onEnter }: {
  value: string | null; onChange: (v: string) => void;
  placeholder?: string; onEnter?: () => void;
}) {
  return (
    <input
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={styledInput}
      onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--emb)'; }}
      onBlur={e  => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...styledInput, resize: 'vertical' }}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={styledInput}>
      {children}
    </select>
  );
}

// ── Pills ─────────────────────────────────────────────────────────────────────

export function Pills<T extends string>({ options, value, onChange }: {
  options: { v: T; l: string }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
      {options.map(o => (
        <button
          key={o.v} onClick={() => onChange(o.v)} type="button"
          style={{
            flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 'var(--r1)',
            border: `1px solid ${value === o.v ? 'var(--em)' : 'var(--b2)'}`,
            background: value === o.v ? 'var(--emb)' : 'var(--bg3)',
            color: value === o.v ? 'var(--em)' : 'var(--t3)',
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

// ── ColorField ────────────────────────────────────────────────────────────────

export function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 30, height: 26, border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', padding: 1 }}
        />
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...styledInput, flex: 1, fontFamily: 'monospace', fontSize: 11 }}
        />
      </div>
    </Field>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider() {
  return <div style={{ height: 1, background: 'var(--b2)', margin: '5px 0' }} />;
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', margin: '4px 0 2px', letterSpacing: '.3px' }}>
      {children}
    </div>
  );
}

// ── Alignment/border option constants ─────────────────────────────────────────

export const ALIGN_OPTS: { v: AlignOption; l: string }[] = [
  { v: 'right', l: 'يمين' }, { v: 'center', l: 'وسط' }, { v: 'left', l: 'يسار' },
];

export const BORDER_OPTS: { v: BorderStyle; l: string }[] = [
  { v: 'solid', l: '─' }, { v: 'dashed', l: '- -' },
  { v: 'double', l: '═' }, { v: 'none', l: 'بلا' },
];
