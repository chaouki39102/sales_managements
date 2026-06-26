// resources/js/pages/settings/print-settings/sections/ItemsSection.tsx
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
    const newShow = { ...tpl.colShow, [key]: show };
    update('colShow', newShow);
    if (show && !tpl.colOrder.includes(key)) {
      update('colOrder', [...tpl.colOrder, key]);
    }
  };

  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const idx = tpl.colOrder.indexOf(key);
    if (idx === -1) return;
    const newOrder = [...tpl.colOrder];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    update('colOrder', newOrder);
  };

  const changeColWidth = (key: ColumnKey, width: number) => {
    update('colWidths', { ...tpl.colWidths, [key]: Math.max(5, Math.min(60, width)) });
  };

  const changeColHeader = (key: ColumnKey, header: string) => {
    update('colHeaders', { ...tpl.colHeaders, [key]: header });
  };

  return (
    <>
      <Section title="الأعمدة — إظهار / ترتيب / عرض" icon="ti-list-details">
        <div className="ps-section-sub" style={{ marginBottom: 8 }}>
          اختر الأعمدة التي تظهر في جدول المنتجات، ورتبها حسب ما تريد
        </div>

        {COLUMNS.map(col => {
          const visible = tpl.colShow[col.key] !== false;
          const idx = tpl.colOrder.indexOf(col.key);
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
                disabled={idx >= tpl.colOrder.length - 1}
                style={{ opacity: idx >= tpl.colOrder.length - 1 ? 0.3 : 1 }}>
                <i className="ti ti-chevron-left" />
              </button>

              {visible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input type="range" min={5} max={60} step={1}
                    value={tpl.colWidths[col.key] ?? 20}
                    onChange={e => changeColWidth(col.key, Number(e.target.value))}
                    style={{ width: 50, height: 3 }} />
                  <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 20 }}>
                    {tpl.colWidths[col.key] ?? 20}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="تنسيق جدول المنتجات" icon="ti-table-options">
        <SliderField label="حجم الخط" value={tpl.fontSizeItems} min={7} max={14} unit="px"
          onChange={v => update('fontSizeItems', v)} />

        <div className="ps-field">
          <label className="ps-field-label">نوع الخط</label>
          <select className="ps-select" value={tpl.itemsFontFamily}
            onChange={e => update('itemsFontFamily', e.target.value as any)}>
            <option value="tajawal">Tajawal (واضح)</option>
            <option value="monospace">Courier (أحادي)</option>
          </select>
        </div>

        <Toggle value={tpl.showColHeader} onChange={v => update('showColHeader', v)} label="إظهار رأس الجدول" />
        {tpl.showColHeader && (
          <>
            <Toggle value={tpl.tableHeaderBold} onChange={v => update('tableHeaderBold', v)} label="خط عريض للرأس" />
            <Toggle value={tpl.tableHeaderBg} onChange={v => update('tableHeaderBg', v)} label="خلفية للرأس" />
            {COLUMNS.filter(c => tpl.colShow[c.key] !== false).map(col => {
              if (col.key === 'name' || col.key === 'quantity' || col.key === 'price' || col.key === 'total') {
                return (
                  <div className="ps-field" key={col.key} style={{ marginTop: 2 }}>
                    <label className="ps-field-label">رأس: {col.label}</label>
                    <input className="ps-input" style={{ fontSize: 11 }}
                      value={tpl.colHeaders[col.key] ?? ''}
                      onChange={e => changeColHeader(col.key, e.target.value)}
                      placeholder={col.label} />
                  </div>
                );
              }
              return null;
            })}
          </>
        )}

        <BorderSelect label="حدود الجدول" value={tpl.tableBorderStyle}
          onChange={v => update('tableBorderStyle', v)} />
        <Toggle value={tpl.alternatingRows} onChange={v => update('alternatingRows', v)} label="تلوين متناوب للأسطر" />
      </Section>

      <Section title="خيارات عرض الأسعار" icon="ti-calculator">
        <div className="ps-field">
          <label className="ps-field-label">عرض الأسعار</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {(['ht', 'ttc'] as const).map(m => (
              <button key={m} className={`ps-paper-pill ${tpl.priceDisplay === m ? 'on' : ''}`}
                onClick={() => update('priceDisplay', m)}>
                {m === 'ht' ? 'HT (بدون ضريبة)' : 'TTC (بالضريبة)'}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
