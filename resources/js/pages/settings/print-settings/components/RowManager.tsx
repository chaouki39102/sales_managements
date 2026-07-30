import React, { useState } from 'react';
import type { LayoutRow, LayoutColumn, AlignOption } from '../types/domain';

export interface FieldOption {
  value: string;
  label: string;
}

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10,
  color: 'var(--t3)', padding: 0, flexShrink: 0,
};

const selectStyle: React.CSSProperties = {
  padding: '2px 4px', borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg2)', fontSize: 10, color: 'var(--t2)',
  minWidth: 0, flex: 1,
};

function makeColId(rowId: string, idx: number): string {
  return `${rowId}_col_${idx}`;
}

let _nextRow = 0;
function nextRowId(): string {
  return `row_${Date.now()}_${_nextRow++}`;
}

function nextColId(rowId: string, cols: LayoutColumn[]): string {
  return `${rowId}_col_${cols.length}`;
}

/**/


interface Props {
  rows: LayoutRow[];
  onChange: (rows: LayoutRow[]) => void;
  /** Available fields for the column picker. When provided, multi-column mode is enabled. */
  fields?: FieldOption[];
  /** Placeholder text for the "Add Row" button */
  addLabel?: string;
}

export function RowManager({ rows, onChange, fields, addLabel = '+ إضافة سطر' }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const multiCol = !!fields && fields.length > 0;

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

  const removeRow = (id: string) => {
    onChange(rows.filter(r => r.id !== id).map((r, i) => ({ ...r, order: i })));
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

  const addRow = () => {
    const id = nextRowId();
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1;
    const col: LayoutColumn = {
      id: nextColId(id, []),
      field: fields?.[0]?.value ?? '',
      label: fields?.[0]?.label ?? '',
      width: 1,
      alignment: 'right',
      labelSide: 'start',
      valueSide: 'end',
    };
    const newRow: LayoutRow = {
      id,
      order: maxOrder,
      visible: true,
      columns: [col],
    };
    onChange([...rows, newRow]);
  };

  const addColumn = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const cols = row.columns ?? [];
    const col: LayoutColumn = {
      id: nextColId(rowId, cols),
      field: fields?.[0]?.value ?? '',
      label: fields?.[0]?.label ?? '',
      width: 1,
      alignment: 'right',
      labelSide: 'start',
      valueSide: 'end',
    };
    patch(rowId, { columns: [...cols, col] });
  };

  const patchColumn = (rowId: string, colId: string, p: Partial<LayoutColumn>) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const cols = (row.columns ?? []).map(c => c.id === colId ? { ...c, ...p } : c);
    patch(rowId, { columns: cols });
  };

  const removeColumn = (rowId: string, colId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const cols = (row.columns ?? []).filter(c => c.id !== colId);
    patch(rowId, { columns: cols });
  };

  /** Legacy mode: convert single-field row to columns array */
  const ensureColumns = (row: LayoutRow): LayoutColumn[] => {
    if (row.columns && row.columns.length > 0) return row.columns;
    return [{
      id: makeColId(row.id, 0),
      field: row.field ?? '',
      literalText: row.literalText,
      label: row.label,
      width: 1,
      alignment: 'right',
      labelSide: row.labelSide ?? 'start',
      valueSide: row.valueSide ?? 'end',
      bold: row.bold,
      color: row.color,
      fontSize: row.fontSize,
    }];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sorted.map((row, idx) => {
        const isDragging = dragId === row.id;
        const cols = ensureColumns(row);
        const hasTopBorder = row.border?.style && row.border.style !== 'none';

        return (
          <div
            key={row.id}
            draggable
            onDragStart={() => setDragId(row.id)}
            onDragOver={e => handleDragOver(e, row.id)}
            onDragEnd={() => setDragId(null)}
            style={{
              borderRadius: 'var(--r1)',
              background: row.visible ? 'var(--emb)' : 'var(--bg3)',
              border: `1px solid ${row.visible ? 'var(--embo)' : 'var(--b1)'}`,
              cursor: 'grab', opacity: isDragging ? 0.4 : 1,
              padding: 4,
            }}
          >
            {/* Row header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                flex: 1, fontSize: 10.5, fontWeight: 600, color: 'var(--t3)',
                minWidth: 0, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <i className="ti ti-grip-vertical" style={{ fontSize: 9, opacity: 0.3 }} />
                {multiCol
                  ? `${cols.length === 1 ? 'عمود واحد' : `${cols.length} أعمدة`}`
                  : (row.label ?? row.id)
                }
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
                type="button" title="خط فاصل"
              >
                <i className="ti ti-separator-horizontal" />
              </button>

              <button
                onClick={() => removeRow(row.id)}
                style={{ ...miniBtn, color: '#c44' }}
                type="button" title="حذف الصف"
              >
                <i className="ti ti-trash" />
              </button>
            </div>

            {/* Columns */}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, paddingInlineStart: 20 }}>
              {cols.map((col, ci) => (
                <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {multiCol && (
                    <span style={{ fontSize: 8, color: 'var(--t4)', width: 10, textAlign: 'center', flexShrink: 0 }}>
                      {ci + 1}
                    </span>
                  )}

                  {fields ? (
                    <select
                      value={col.field}
                      onChange={e => {
                        const opt = fields.find(f => f.value === e.target.value);
                        patchColumn(row.id, col.id, {
                          field: e.target.value,
                          label: opt?.label ?? e.target.value,
                        });
                      }}
                      style={selectStyle}
                    >
                      <option value="">— اختر حقل —</option>
                      {fields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={col.field}
                      onChange={e => patchColumn(row.id, col.id, { field: e.target.value })}
                      style={{ ...selectStyle, fontFamily: 'monospace', fontSize: 9 }}
                      placeholder="field.id"
                    />
                  )}

                  <input
                    value={col.label ?? ''}
                    onChange={e => patchColumn(row.id, col.id, { label: e.target.value })}
                    style={{ ...selectStyle, flex: 0.6 }}
                    placeholder="تسمية"
                  />

                  <select
                    value={col.alignment}
                    onChange={e => patchColumn(row.id, col.id, { alignment: e.target.value as AlignOption })}
                    style={{ ...selectStyle, flex: 'none', width: 50 }}
                  >
                    <option value="right">يمين</option>
                    <option value="center">وسط</option>
                    <option value="left">يسار</option>
                  </select>

                  <select
                    value={col.width}
                    onChange={e => patchColumn(row.id, col.id, { width: Number(e.target.value) })}
                    style={{ ...selectStyle, flex: 'none', width: 40 }}
                  >
                    {[1,2,3,4,5,6].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>

                  {cols.length > 1 && (
                    <button
                      onClick={() => removeColumn(row.id, col.id)}
                      style={{ ...miniBtn, color: '#c44', width: 16, height: 16, fontSize: 8 }}
                      type="button" title="حذف العمود"
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Column button */}
            {multiCol && (
              <button
                onClick={() => addColumn(row.id)}
                style={{
                  marginTop: 3, marginLeft: 20, padding: '2px 8px',
                  background: 'none', border: '1px dashed var(--b3)',
                  borderRadius: 4, fontSize: 9, color: 'var(--t4)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                }}
                type="button"
              >
                <i className="ti ti-plus" style={{ fontSize: 8 }} /> إضافة عمود
              </button>
            )}
          </div>
        );
      })}

      {/* Add Row button */}
      <button
        onClick={addRow}
        style={{
          padding: '5px 10px', background: 'none',
          border: '1px dashed var(--b3)', borderRadius: 'var(--r1)',
          fontSize: 11, color: 'var(--t4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}
        type="button"
      >
        <i className="ti ti-plus" style={{ fontSize: 10 }} /> {addLabel}
      </button>
    </div>
  );
}
