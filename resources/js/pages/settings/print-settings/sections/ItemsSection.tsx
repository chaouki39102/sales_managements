import React from 'react';
import type { ReceiptTemplate80mm, ColumnKey } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { BorderSelect } from './HeaderSection';

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
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function ItemsSectionControls({ tpl, update }: Props) {
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

  const changeColWidth = (key: ColumnKey, width: number) => {
    update('col_widths', { ...tpl.col_widths, [key]: Math.max(5, Math.min(60, width)) });
  };

  const changeColHeader = (key: ColumnKey, header: string) => {
    update('col_headers', { ...tpl.col_headers, [key]: header });
  };

  const changeColAlign = (key: ColumnKey, align: 'right' | 'left' | 'center') => {
    update('col_aligns', { ...tpl.col_aligns, [key]: align });
  };

  const ALIGN_OPTIONS: { key: 'right' | 'left' | 'center'; label: string }[] = [
    { key: 'right', label: 'يمين' },
    { key: 'center', label: 'وسط' },
    { key: 'left', label: 'يسار' },
  ];

  return (
    <>
      <Section title="الأعمدة — إظهار / ترتيب / عرض" icon="ti-list-details">
        <div className="ps-section-sub" style={{ marginBottom: 8 }}>
          اختر الأعمدة التي تظهر في جدول المنتجات، ورتبها حسب ما تريد
        </div>

        {COLUMNS.map(col => {
          const visible = tpl.col_show[col.key] !== false;
          const idx = tpl.col_order.indexOf(col.key);
          return (
            <div key={col.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 0', borderBottom: '1px solid var(--b1)',
            }}>
              <div
                className={`ps-toggle-track ${visible ? 'on' : ''}`}
                onClick={() => toggleCol(col.key, !visible)}
                style={{ flexShrink: 0 }}
              >
                <div className="ps-toggle-thumb" />
              </div>

              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
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
                    {ALIGN_OPTIONS.map(a => (
                      <button key={a.key}
                        className={`ps-paper-pill ${(tpl.col_aligns?.[col.key] ?? 'right') === a.key ? 'on' : ''}`}
                        onClick={() => changeColAlign(col.key, a.key)}
                        style={{ fontSize: 9, padding: '1px 4px' }}>
                        {a.label}
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

      <Section title="تنسيق جدول المنتجات" icon="ti-table-options">
        <SliderField label="حجم الخط" value={tpl.items_font_size} min={7} max={14} unit="px"
          onChange={v => update('items_font_size', v)} />

        <div className="ps-field">
          <label className="ps-field-label">نوع الخط</label>
          <select className="ps-select" value={tpl.items_font_family}
            onChange={e => update('items_font_family', e.target.value as any)}>
            <option value="tajawal">Tajawal (واضح)</option>
            <option value="monospace">Courier (أحادي)</option>
          </select>
        </div>

        <Toggle value={tpl.show_col_header} onChange={v => update('show_col_header', v)} label="إظهار رأس الجدول" />
        {tpl.show_col_header && (
          <>
            <Toggle value={tpl.table_header_bold} onChange={v => update('table_header_bold', v)} label="خط عريض للرأس" />
            <Toggle value={tpl.table_header_bg} onChange={v => update('table_header_bg', v)} label="خلفية للرأس" />
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

        <BorderSelect label="حدود الجدول" value={tpl.table_border_style}
          onChange={v => update('table_border_style', v as any)} />
        <Toggle value={tpl.alternating_rows} onChange={v => update('alternating_rows', v)} label="تلوين متناوب للأسطر" />
      </Section>

      <Section title="خيارات عرض الأسعار" icon="ti-calculator">
        <div className="ps-field">
          <label className="ps-field-label">عرض الأسعار</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {(['ht', 'ttc'] as const).map(m => (
              <button key={m} className={`ps-paper-pill ${tpl.price_display === m ? 'on' : ''}`}
                onClick={() => update('price_display', m)}>
                {m === 'ht' ? 'HT (بدون ضريبة)' : 'TTC (بالضريبة)'}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
