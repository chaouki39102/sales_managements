import React, { useRef, useState } from 'react';
import type { LayoutRow, AlignOption, LogicalSide } from '../../types';
import type { PrintFieldGroup } from '../../services/PrintFieldRegistry';
import FieldPickerModal from './FieldPickerModal';

interface Props {
  rows: LayoutRow[];
  onChange: (rows: LayoutRow[]) => void;
  label?: string;
  fieldGroup?: PrintFieldGroup;
}

let _idCounter = 0;
function nextId(): string {
  _idCounter++;
  return `r${_idCounter}_${Date.now()}`;
}

export default function RowBuilder({ rows, onChange, label, fieldGroup }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  const ordered = [...rows].sort((a, b) => a.order - b.order);

  function reorder(from: number, to: number) {
    const list = [...rows];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    onChange(list.map((r, i) => ({ ...r, order: i })));
  }

  function addField(fieldId: string, label: string) {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order), -1);
    onChange([...rows, {
      id: nextId(),
      field: fieldId,
      label,
      visible: true,
      order: maxOrder + 1,
      labelSide: 'start',
      valueSide: 'end',
    }]);
  }

  function removeField(idx: number) {
    const list = rows.filter((_, i) => i !== idx);
    onChange(list.map((r, i) => ({ ...r, order: i })));
  }

  function toggleVisible(idx: number) {
    const list = [...rows];
    list[idx] = { ...list[idx], visible: !list[idx].visible };
    onChange(list);
  }

  function updateField(idx: number, patch: Partial<LayoutRow>) {
    const list = [...rows];
    list[idx] = { ...list[idx], ...patch };
    onChange(list);
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    reorder(dragIdx.current, idx);
    dragIdx.current = idx;
  }

  function onDragEnd() {
    dragIdx.current = null;
  }

  return (
    <div className="ps-field" style={{ border: '1px solid var(--b2)', borderRadius: 8, padding: 8, position: 'relative' }}>
      {label && <label className="ps-field-label">{label}</label>}

      <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 8 }}>
        {ordered.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
            لا توجد حقول — اضف حقول من الأسفل
          </div>
        )}
        {ordered.map((r, i) => {
          const realIdx = rows.indexOf(r);
          return (
            <div key={r.id}
              draggable
              onDragStart={e => onDragStart(e, realIdx)}
              onDragOver={e => onDragOver(e, realIdx)}
              onDragEnd={onDragEnd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
                marginBottom: 3, background: '#f8f9fa', borderRadius: 6,
                cursor: 'grab', border: '1px solid #e9ecef', position: 'relative',
              }}
            >
              <span style={{ cursor: 'grab', color: '#999', fontSize: 14, userSelect: 'none' }}>⠿</span>
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{r.label || r.field}</span>
              <span style={{ fontSize: 10, color: '#aaa', direction: 'ltr' }}>{r.field}</span>
              <button onClick={() => toggleVisible(realIdx)}
                title={r.visible ? 'إخفاء' : 'إظهار'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 2px', opacity: r.visible ? 1 : 0.3 }}>
                👁
              </button>
              <button onClick={() => setEditIdx(editIdx === realIdx ? null : realIdx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#666' }}>
                ⚙
              </button>
              <button onClick={() => removeField(realIdx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#c00' }}>
                ✕
              </button>

              {editIdx === realIdx && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 10,
                  marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>التسمية</label>
                      <input type="text" value={r.label || ''}
                        onChange={e => updateField(realIdx, { label: e.target.value })}
                        style={{ width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }} />
                    </div>
                    <div style={{ width: 80 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>الترتيب</label>
                      <input type="number" value={r.order}
                        onChange={e => updateField(realIdx, { order: Number(e.target.value) })}
                        style={{ width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>محاذاة التسمية</label>
                      <select value={r.labelSide ?? 'start'}
                        onChange={e => updateField(realIdx, { labelSide: e.target.value as LogicalSide })}
                        style={{ width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}>
                        <option value="start">اليمين (بداية)</option>
                        <option value="end">اليسار (نهاية)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>محاذاة القيمة</label>
                      <select value={r.valueSide ?? 'end'}
                        onChange={e => updateField(realIdx, { valueSide: e.target.value as LogicalSide })}
                        style={{ width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}>
                        <option value="end">اليمين (نهاية)</option>
                        <option value="start">اليسار (بداية)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <input type="checkbox" checked={r.bold ?? false}
                        onChange={e => updateField(realIdx, { bold: e.target.checked })} />
                      عريض
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>اللون</label>
                      <input type="color" value={r.color || '#000000'}
                        onChange={e => updateField(realIdx, { color: e.target.value })}
                        style={{ width: 36, height: 24, padding: 0, border: 'none', cursor: 'pointer' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 11, color: '#666' }}>حجم الخط</label>
                      <input type="number" value={r.fontSize ?? ''}
                        onChange={e => updateField(realIdx, { fontSize: Number(e.target.value) || undefined })}
                        style={{ width: 55, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
                        placeholder={9} />
                    </div>
                    <button onClick={() => setEditIdx(null)}
                      style={{ padding: '3px 10px', background: '#e9ecef', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 'auto' }}>
                      تم
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setPickerOpen(true)}
        style={{
          width: '100%', padding: '6px 0', background: '#f0f4ff', border: '2px dashed #c5d5f0',
          borderRadius: 6, cursor: 'pointer', color: '#2b5797', fontSize: 13, fontWeight: 600,
        }}>
        + إضافة حقل
      </button>

      <FieldPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(fieldId, label) => addField(fieldId, label)}
        group={fieldGroup}
      />
    </div>
  );
}
