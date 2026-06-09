// ════════════════════════════════════════════════════════════════════════════
// DataTable/Primitives.tsx
// مكوّنات بدائية صغيرة: Skeleton، EditInput، SkeletonCard
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, memo } from 'react';
import type { KeyboardEvent }  from 'react';
import type { EditDef }         from './types';
import { SKELETON_WIDTHS }      from './types';

// ─── SkeletonRows (جدول) ─────────────────────────────────────────────────────

export function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => {
            const w = SKELETON_WIDTHS[(r * cols + c) % SKELETON_WIDTHS.length];
            return (
              <td key={c} className="dt-skel-td">
                <span
                  className="dt-skel"
                  style={{
                    height: 13,
                    width: `${w}%`,
                    animationDelay: `${(r * 0.08 + c * 0.03).toFixed(2)}s`,
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ─── SkeletonCards (موبايل) ───────────────────────────────────────────────────

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="dt-card-skeletons">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dt-card-skel-item">
          <span
            className="dt-skel"
            style={{
              display: 'block',
              height: '100%',
              animationDelay: `${(i * 0.12).toFixed(2)}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── EditInput ───────────────────────────────────────────────────────────────

export const EditInput = memo(function EditInput({
  def, value, onChange, onCommit, onCancel,
}: {
  def:      EditDef;
  value:    string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // تركيز تلقائي بعد التصيير
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    if (inputRef.current instanceof HTMLInputElement && inputRef.current.type !== 'date') {
      inputRef.current.select();
    }
  }, []);

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  if (def.type === 'select') return (
    <select
      autoFocus={true}
      ref={inputRef as React.RefObject<HTMLSelectElement>}
      className="dt-edit-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKey}
    >
      {def.options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className="dt-edit-input"
      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
      value={value}
      min={def.type === 'number' ? def.min : undefined}
      max={def.type === 'number' ? def.max : undefined}
      step={def.type === 'number' ? (def.step ?? 'any') : undefined}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKey}
    />
  );
});
