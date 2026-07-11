import React, { useState } from 'react';
import type { LayoutRow } from '../types/domain';

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10,
  color: 'var(--t3)', padding: 0, flexShrink: 0,
};

interface Props {
  rows: LayoutRow[];
  onChange: (rows: LayoutRow[]) => void;
}

export function RowManager({ rows, onChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sorted = [...rows].sort((a, b) => a.order - b.order);

  const patch = (id: string, p: Partial<LayoutRow>) =>
    onChange(rows.map(r => (r.id === id ? { ...r, ...p } : r)));

  const move = (id: string, dir: -1 | 1) => {
    const idx = sorted.findIndex(r => r.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    onChange(reordered.map((r, i) => ({ ...r, order: i })));
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = sorted.findIndex(r => r.id === dragId);
    const to = sorted.findIndex(r => r.id === overId);
    if (from < 0 || to < 0) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onChange(reordered.map((r, i) => ({ ...r, order: i })));
    setDragId(overId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sorted.map((row, idx) => {
        const isDragging = dragId === row.id;
        const hasTopBorder = row.border?.style && row.border.style !== 'none';

        return (
          <div
            key={row.id}
            draggable
            onDragStart={() => setDragId(row.id)}
            onDragOver={e => handleDragOver(e, row.id)}
            onDragEnd={() => setDragId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px',
              borderRadius: 'var(--r1)',
              background: row.visible ? 'var(--emb)' : 'var(--bg3)',
              border: `1px solid ${row.visible ? 'var(--embo)' : 'var(--b1)'}`,
              cursor: 'grab', opacity: isDragging ? 0.4 : 1,
            }}
          >
            <div
              onClick={() => patch(row.id, { visible: !row.visible })}
              style={{
                width: 28, height: 15, borderRadius: 8, flexShrink: 0,
                background: row.visible ? 'var(--em)' : 'var(--bg5)',
                border: `1px solid ${row.visible ? 'var(--em)' : 'var(--b3)'}`,
                position: 'relative', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 1.5,
                left: row.visible ? 12 : 1.5,
                width: 10, height: 10, borderRadius: '50%', background: '#fff',
                transition: 'left .15s',
              }} />
            </div>

            <span style={{
              flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--t2)',
              minWidth: 0, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-grip-vertical" style={{ fontSize: 9, opacity: 0.3 }} />
              {row.label ?? row.id}
            </span>

            <button onClick={() => move(row.id, -1)} disabled={idx <= 0}
              style={{ ...miniBtn, opacity: idx <= 0 ? .3 : 1 }} type="button" title="لأعلى">
              <i className="ti ti-chevron-up" />
            </button>
            <button onClick={() => move(row.id, 1)} disabled={idx >= sorted.length - 1}
              style={{ ...miniBtn, opacity: idx >= sorted.length - 1 ? .3 : 1 }} type="button" title="لأسفل">
              <i className="ti ti-chevron-down" />
            </button>

            <button
              onClick={() => patch(row.id, { labelSide: row.valueSide, valueSide: row.labelSide })}
              style={miniBtn} type="button" title="عكس جهة اللقب/القيمة"
            >
              <i className="ti ti-arrows-left-right" />
            </button>

            <button
              onClick={() => patch(row.id, { bold: !row.bold })}
              style={{ ...miniBtn, fontWeight: 900, color: row.bold ? 'var(--em)' : 'var(--t3)' }}
              type="button" title="عريض"
            >
              B
            </button>

            <button
              onClick={() => patch(row.id, {
                border: hasTopBorder
                  ? { ...row.border, style: 'none' }
                  : { style: 'solid', width: 1, color: '#111', sides: { top: true } },
              })}
              style={{ ...miniBtn, color: hasTopBorder ? 'var(--em)' : 'var(--t3)' }}
              type="button" title="خط فاصل أعلى الصف"
            >
              <i className="ti ti-separator-horizontal" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
