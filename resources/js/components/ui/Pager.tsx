import React from 'react';
import type { PaginationMeta } from '@/lib/api/core/types';

interface PagerProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  perPageLabels?: Record<number, string>;
  recordLabel?: string;
}

export function Pager({ meta, onPageChange, onPerPageChange, perPageOptions = [10, 25, 50, 100], perPageLabels, recordLabel = 'سجل' }: PagerProps) {
  const { current_page, last_page, per_page, total, from, to } = meta;
  if (last_page <= 1) return null;

  const pages: (number | '…')[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current_page > 3) pages.push('…');
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i);
    }
    if (current_page < last_page - 2) pages.push('…');
    pages.push(last_page);
  }

  const btn = (active = false, disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, padding: '0 8px',
    border: `1px solid ${active ? 'var(--em)' : 'var(--bd)'}`,
    borderRadius: 6, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? 'var(--em)' : 'var(--bg1)',
    color: active ? '#fff' : disabled ? 'var(--t4)' : 'var(--t2)',
    opacity: disabled ? 0.45 : 1,
    transition: 'background .12s, border-color .12s',
    userSelect: 'none',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, padding: '10px 16px',
      borderTop: '1px solid var(--bd)', fontSize: 13,
    }}>
      <span style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {from ?? 1}–{to ?? total} من أصل{' '}
        <strong style={{ color: 'var(--t1)' }}>{total.toLocaleString('ar-DZ')}</strong>{' '}
        {recordLabel}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button style={btn(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(1)} title="الصفحة الأولى">
          <i className="ti ti-chevrons-right" style={{ fontSize: 13 }} />
        </button>
        <button style={btn(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)} title="السابق">
          <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--t4)' }}>…</span>
          ) : (
            <button key={p} style={btn(p === current_page)}
              onClick={() => p !== current_page && onPageChange(p as number)}>
              {p}
            </button>
          )
        )}

        <button style={btn(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)} title="التالي">
          <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
        </button>
        <button style={btn(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(last_page)} title="الصفحة الأخيرة">
          <i className="ti ti-chevrons-left" style={{ fontSize: 13 }} />
        </button>
      </div>

      {onPerPageChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t3)' }}>
          <span>عدد السطور:</span>
          <select value={per_page} onChange={(e) => onPerPageChange(Number(e.target.value))}
            style={{
              padding: '3px 6px', border: '1px solid var(--bd)', borderRadius: 6,
              fontSize: 13, background: 'var(--bg1)', color: 'var(--t2)',
              outline: 'none', cursor: 'pointer',
            }}>
            {perPageOptions.map((n) => <option key={n} value={n}>{perPageLabels?.[n] ?? n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
