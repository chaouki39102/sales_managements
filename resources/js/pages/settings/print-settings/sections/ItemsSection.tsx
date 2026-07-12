import React, { useState, useRef } from 'react';
import type { ColumnKey, FontFamily, BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { ColorField } from '../components/ui';
import { BorderSelect } from './HeaderSection';
import { isSettingVisible } from '../services/SettingsRegistry';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر' },
  { key: 'barcode',   label: 'باركود المنتج' },
  { key: 'ref',       label: 'المرجع' },
  { key: 'name',      label: 'اسم المنتج' },
  { key: 'unit',      label: 'الوحدة' },
  { key: 'quantity',  label: 'الكمية' },
  { key: 'price',     label: 'السعر' },
  { key: 'discount',  label: 'الخصم' },
  { key: 'tva',       label: 'نسبة TVA' },
  { key: 'total',     label: 'المجموع' },
];

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function ItemsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const dragOverKey = useRef<ColumnKey | null>(null);
  const lastDropTarget = useRef<ColumnKey | null>(null);

  const toggleCol = (key: ColumnKey, show: boolean) => {
    const newShow = { ...tpl.col_show, [key]: show };
    update('col_show', newShow);
    if (show && !tpl.col_order.includes(key)) {
      update('col_order', [...tpl.col_order, key]);
    }
  };

  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const idx = tpl.col_order.indexOf(key);
    if (idx === -1) return;
    const newOrder = [...tpl.col_order];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    update('col_order', newOrder);
  };

  const handleDragStart = (key: ColumnKey) => {
    setDragKey(key);
  };

  const handleDragOver = (e: React.DragEvent, key: ColumnKey) => {
    e.preventDefault();
    if (!dragKey || dragKey === key) return;
    if (lastDropTarget.current === key) return;
    lastDropTarget.current = key;
    dragOverKey.current = key;
    const from = tpl.col_order.indexOf(dragKey);
    const to = tpl.col_order.indexOf(key);
    if (from < 0 || to < 0) return;
    const newOrder = [...tpl.col_order];
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragKey);
    update('col_order', newOrder);
    setDragKey(key);
  };

  const handleDragEnd = () => {
    setDragKey(null);
    dragOverKey.current = null;
    lastDropTarget.current = null;
  };

  const changeColWidth = (key: ColumnKey, width: number) => {
    update('col_widths', { ...tpl.col_widths, [key]: Math.max(5, Math.min(60, width)) });
  };

  const changeColHeader = (key: ColumnKey, header: string) => {
    update('col_headers', { ...tpl.col_headers, [key]: header });
  };

  const changeColAlign = (key: ColumnKey, align: 'right' | 'left' | 'center') => {
    update('col_aligns', { ...tpl.col_aligns, [key]: align });
  };

  return (
    <>
      {sec('col_order') && (
        <Section title="الأعمدة — إظهار / ترتيب / عرض" icon="ti-list-details">
          <div className="ps-section-sub" style={{ marginBottom: 8 }}>
            اختر الأعمدة التي تظهر في جدول المنتجات، ورتبها حسب ما تريد — اسحب وأفلت لإعادة الترتيب
          </div>

          {COLUMNS.map(col => {
            const visible = tpl.col_show[col.key] !== false;
            const idx = tpl.col_order.indexOf(col.key);
            const isDragging = dragKey === col.key;
            return (
              <div key={col.key} draggable
                onDragStart={() => handleDragStart(col.key)}
                onDragOver={e => handleDragOver(e, col.key)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 0', borderBottom: '1px solid var(--b1)',
                  cursor: 'grab',
                  opacity: isDragging ? 0.4 : 1,
                  background: isDragging ? 'var(--emb)' : 'transparent',
                  borderTop: dragOverKey.current === col.key && dragKey !== col.key ? '2px solid var(--em)' : 'none',
                  borderTopStyle: dragOverKey.current === col.key && dragKey !== col.key ? 'dashed' : 'none',
                }}>
                <div
                  className={`ps-toggle-track ${visible ? 'on' : ''}`}
                  onClick={() => toggleCol(col.key, !visible)}
                  style={{ flexShrink: 0 }}
                >
                  <div className="ps-toggle-thumb" />
                </div>

                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-grip-vertical" style={{ fontSize: 10, opacity: 0.3 }} />
                  {col.label}
                </span>

                <button className="ps-btn-xs" onClick={() => moveCol(col.key, -1)}
                  disabled={idx <= 0}
                  style={{ opacity: idx <= 0 ? 0.3 : 1 }}>
                  <i className="ti ti-chevron-right" />
                </button>
                <button className="ps-btn-xs" onClick={() => moveCol(col.key, 1)}
                  disabled={idx >= tpl.col_order.length - 1}
                  style={{ opacity: idx >= tpl.col_order.length - 1 ? 0.3 : 1 }}>
                  <i className="ti ti-chevron-left" />
                </button>

                {visible && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div className="ps-paper-pills" style={{ gap: 2 }}>
                      {(['right', 'center', 'left'] as const).map(a => (
                        <button key={a}
                          className={`ps-paper-pill ${(tpl.col_aligns?.[col.key] ?? 'right') === a ? 'on' : ''}`}
                          onClick={() => changeColAlign(col.key, a)}
                          style={{ fontSize: 9, padding: '1px 4px' }}>
                          {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
                        </button>
                      ))}
                    </div>
                    <input type="range" min={5} max={60} step={1}
                      value={tpl.col_widths[col.key] ?? 20}
                      onChange={e => changeColWidth(col.key, Number(e.target.value))}
                      style={{ width: 40, height: 3 }} />
                    <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 20 }}>
                      {tpl.col_widths[col.key] ?? 20}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      <Section title="تنسيق جدول المنتجات" icon="ti-table-options">
        {sec('items_font_size') && <SliderField label="حجم الخط" value={tpl.items_font_size} min={7} max={14} unit="px"
          onChange={v => update('items_font_size', v)} />}

        {sec('items_font_family') && <div className="ps-field">
          <label className="ps-field-label">نوع الخط</label>
          <select className="ps-select" value={tpl.items_font_family}
            onChange={e => update('items_font_family', e.target.value as FontFamily)}>
            <option value="tajawal">Tajawal (واضح)</option>
            <option value="monospace">Courier (أحادي)</option>
          </select>
        </div>}

        {sec('show_col_header') && <Toggle value={tpl.show_col_header} onChange={v => update('show_col_header', v)} label="إظهار رأس الجدول" />}
        {sec('show_col_header') && tpl.show_col_header && (
          <>
            {sec('table_header_bold') && <Toggle value={tpl.table_header_bold} onChange={v => update('table_header_bold', v)} label="خط عريض للرأس" />}
            {sec('table_header_bg') && <ColorField label="لون خلفية الرأس" value={tpl.table_header_bg || '#f5f5f5'} onChange={v => update('table_header_bg', v)} />}
            {sec('table_header_color') && <ColorField label="لون نص الرأس" value={tpl.table_header_color || '#111111'} onChange={v => update('table_header_color', v)} />}
            {COLUMNS.filter(c => tpl.col_show[c.key] !== false).map(col => (
              <div className="ps-field" key={col.key} style={{ marginTop: 2 }}>
                <label className="ps-field-label">رأس: {col.label}</label>
                <input className="ps-input" style={{ fontSize: 11 }}
                  value={tpl.col_headers[col.key] ?? ''}
                  onChange={e => changeColHeader(col.key, e.target.value)}
                  placeholder={col.label} />
              </div>
            ))}
          </>
        )}

        {sec('table_cell_padding') && <SliderField value={tpl.table_cell_padding || 6} min={2} max={20} step={1}
          onChange={v => update('table_cell_padding', v)} label="مسافة الخلايا (px)" />}
        {sec('table_border_style') && <BorderSelect label="حدود الجدول" value={tpl.table_border_style}
          onChange={v => update('table_border_style', v as BorderStyle)} />}
        {sec('alternating_rows') && <Toggle value={tpl.alternating_rows} onChange={v => update('alternating_rows', v)} label="تلوين متناوب للأسطر" />}
        {sec('alternating_rows') && tpl.alternating_rows && (
          <ColorField label="لون الأسطر الزوجية" value={tpl.alternating_color} onChange={v => update('alternating_color', v)} />
        )}
      </Section>

      <Section title="خيارات عرض الأسعار" icon="ti-calculator">
        {sec('price_display') && <div className="ps-field">
          <label className="ps-field-label">عرض الأسعار</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {(['ht', 'ttc'] as const).map(m => (
              <button key={m} className={`ps-paper-pill ${tpl.price_display === m ? 'on' : ''}`}
                onClick={() => update('price_display', m)}>
                {m === 'ht' ? 'HT (بدون ضريبة)' : 'TTC (بالضريبة)'}
              </button>
            ))}
          </div>
        </div>}
        {sec('show_line_total_ttc') && <Toggle value={tpl.show_line_total_ttc} onChange={v => update('show_line_total_ttc', v)} label="الإجمالي TTC لكل سطر" />}
      </Section>
    </>
  );
}
