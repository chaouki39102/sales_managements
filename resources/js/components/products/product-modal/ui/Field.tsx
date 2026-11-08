// Field — label + control + hint/error wrapper
import type React from 'react';
import { s } from './styles';

export default function Field({
  label, error, children, hint, col, required,
}: {
  label: string; error?: string; children: React.ReactNode;
  hint?: string; col?: number; required?: boolean;
}) {
  return (
    <div style={{ ...s.field, gridColumn: col ? `span ${col}` : undefined }}>
      <label style={s.label}>
        {label}{required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {hint  && <span style={s.hint}>{hint}</span>}
      {error && <span style={s.errText}>{error}</span>}
    </div>
  );
}
