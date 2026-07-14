import React from 'react';
import type { BorderStyle, LayoutRow, TotalsGridConfig } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { ColorField } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';
import { RowManager } from '../components/RowManager';

const SHOW_TO_FIELD: Record<string, string> = {
  show_total_ht:        'totals.ht',
  show_total_tva:       'totals.tva',
  show_tva_breakdown:   'totals.tvaBreakdownGroup',
  show_discount_total:  'totals.discount',
  show_fiscal_stamp:    'totals.fiscalStamp',
  show_total_ttc:       'totals.ttc',
  show_amount_in_words: 'totals.amountInWords',
  show_paid_amount:     'totals.paid',
  show_change:          'totals.change',
  show_remaining:       'totals.remaining',
  show_prev_balance:    'balance.previous',
  show_new_balance:     'balance.current',
};

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  const toggleWithRow = (key: keyof PrintTemplate, val: boolean) => {
    update(key, val as any);
    const field = SHOW_TO_FIELD[key as string];
    if (field) {
      const rows = [...(tpl.totals_rows ?? [])];
      const idx = rows.findIndex(r => r.field === field);
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], visible: val };
      } else if (val) {
        const maxOrder = rows.reduce((m, r) => Math.max(m, r.order), -1);
        rows.push({
          id: key as string, field, visible: true, order: maxOrder + 1,
          labelSide: 'start', valueSide: 'end',
          ...(field === 'totals.ttc' ? { bold: true, fontSize: tpl.total_ttc_font_size, color: tpl.total_ttc_color } : {}),
          ...(field === 'totals.discount' ? { color: '#c00' } : {}),
          ...(field === 'totals.remaining' ? { color: '#c00' } : {}),
          ...(field === 'totals.paid' ? { bold: true } : {}),
          ...(field === 'balance.current' ? { bold: true } : {}),
        } as LayoutRow);
      }
      update('totals_rows', rows);
    }
  };

  const updateTtcRowStyle = (patch: Partial<LayoutRow>) => {
    const rows = [...(tpl.totals_rows ?? [])];
    const idx = rows.findIndex(r => r.field === 'totals.ttc');
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...patch };
      update('totals_rows', rows);
    }
  };

  return (
    <>
      {sec('totals_font_size') && <SliderField label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px"
        onChange={v => update('totals_font_size', v)} />}
      {sec('totals_bold') && <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />}
      {sec('totals_align') && <AlignButtons label="محاذاة الإجماليات" value={tpl.totals_align}
        onChange={v => update('totals_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_total_ht') && <Toggle value={tpl.show_total_ht} onChange={v => toggleWithRow('show_total_ht', v)} label="المجموع HT" />}
      {sec('show_total_tva') && <Toggle value={tpl.show_total_tva} onChange={v => toggleWithRow('show_total_tva', v)} label="مبلغ TVA" />}
      {sec('show_tva_breakdown') && <Toggle value={tpl.show_tva_breakdown} onChange={v => toggleWithRow('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />}
      {sec('show_discount_total') && <Toggle value={tpl.show_discount_total} onChange={v => toggleWithRow('show_discount_total', v)} label="إجمالي الخصومات" />}
      {sec('show_fiscal_stamp') && <Toggle value={tpl.show_fiscal_stamp} onChange={v => toggleWithRow('show_fiscal_stamp', v)} label="الطابع الجبائي" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      {sec('show_total_ttc') && <Toggle value={tpl.show_total_ttc} onChange={v => toggleWithRow('show_total_ttc', v)} label="المجموع TTC (الإجمالي)" />}
      {sec('show_total_ttc') && tpl.show_total_ttc && (
        <>
          {sec('total_ttc_font_size') && <SliderField label="حجم خط TTC" value={tpl.total_ttc_font_size} min={12} max={24} unit="px"
            onChange={v => { update('total_ttc_font_size', v); updateTtcRowStyle({ fontSize: v }); }} />}
          {sec('total_ttc_bold') && <Toggle value={tpl.total_ttc_bold} onChange={v => { update('total_ttc_bold', v); updateTtcRowStyle({ bold: v }); }} label="خط عريض" />}
          {sec('total_ttc_color') && <ColorField label="لون TTC" value={tpl.total_ttc_color} onChange={v => { update('total_ttc_color', v); updateTtcRowStyle({ color: v }); }} />}
          {sec('total_border_style') && <BorderSelect label="إطار TTC" value={tpl.total_border_style}
            onChange={v => { update('total_border_style', v as BorderStyle); updateTtcRowStyle({ border: { style: v as BorderStyle, width: 2, color: '#111', sides: { top: true } } }); }} />}
        </>
      )}

      {sec('show_amount_in_words') && <Toggle value={tpl.show_amount_in_words} onChange={v => toggleWithRow('show_amount_in_words', v)} label="المبلغ بالكتابة" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      {sec('show_paid_amount') && <Toggle value={tpl.show_paid_amount} onChange={v => toggleWithRow('show_paid_amount', v)} label="المبلغ المدفوع" />}
      {sec('show_change') && <Toggle value={tpl.show_change} onChange={v => toggleWithRow('show_change', v)} label="الباقي (الصرف)" />}
      {sec('show_remaining') && <Toggle value={tpl.show_remaining} onChange={v => toggleWithRow('show_remaining', v)} label="المبلغ المتبقي" />}
      {sec('show_prev_balance') && <Toggle value={tpl.show_prev_balance} onChange={v => toggleWithRow('show_prev_balance', v)} label="الرصيد السابق" />}
      {sec('show_new_balance') && <Toggle value={tpl.show_new_balance} onChange={v => toggleWithRow('show_new_balance', v)} label="الرصيد الجديد" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>ترتيب الصفوف</div>
      <RowManager
        rows={tpl.totals_rows ?? []}
        onChange={rows => update('totals_rows', rows)}
      />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>جدول الإجماليات (TVA)</div>
      <Toggle
        value={tpl.totals_grid?.enabled ?? false}
        onChange={v => {
          const grid: TotalsGridConfig = {
            ...(tpl.totals_grid ?? {}),
            enabled: v,
            columns: tpl.totals_grid?.columns ?? [
              { id: 'c1', field: 'grid.baseExcl',      label: 'المبلغ خارج الرسم', order: 0, visible: true, align: 'center' },
              { id: 'c2', field: 'grid.discountPct',    label: 'التخفيض',          order: 1, visible: true, align: 'center' },
              { id: 'c3', field: 'grid.discountAmount', label: 'مبلغ التخفيض',      order: 2, visible: true, align: 'center' },
              { id: 'c4', field: 'grid.tvaRate',        label: 'TVA',              order: 3, visible: true, align: 'center' },
              { id: 'c5', field: 'grid.tvaAmount',      label: 'مبلغ TVA',         order: 4, visible: true, align: 'center' },
            ],
            summaryRows: tpl.totals_grid?.summaryRows ?? [
              { id: 'total_ht', field: 'totals.ht',      label: 'المجموع بدون رسوم', visible: true, order: 0, labelSide: 'start', valueSide: 'end' },
              { id: 'discount', field: 'totals.discount', label: 'مجموع التخفيض',    visible: true, order: 1, labelSide: 'start', valueSide: 'end' },
              { id: 'tva',      field: 'totals.tva',      label: 'مجموع الضريبة',    visible: true, order: 2, labelSide: 'start', valueSide: 'end' },
              { id: 'ttc',      field: 'totals.ttc',      label: 'الصافي للدفع',     visible: true, order: 3, labelSide: 'start', valueSide: 'end', bold: true,
                border: { style: 'double', width: 3, color: '#111', sides: { top: true } } },
            ],
          };
          update('totals_grid', grid);
        }}
        label="تفعيل جدول TVA"
      />
      {tpl.totals_grid?.enabled && (
        <>
          <ColorField label="لون رأس الجدول" value={tpl.totals_grid?.headerBg ?? '#f5f5f5'}
            onChange={v => update('totals_grid', { ...(tpl.totals_grid!), headerBg: v })} />
          <ColorField label="لون حدود الجدول" value={tpl.totals_grid?.borderColor ?? '#333333'}
            onChange={v => update('totals_grid', { ...(tpl.totals_grid!), borderColor: v })} />
          {(tpl.totals_grid?.columns ?? []).map((col, i) => (
            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontSize: 11 }}>
              <Toggle
                value={col.visible}
                onChange={v => {
                  const cols = [...(tpl.totals_grid!.columns)];
                  cols[i] = { ...cols[i], visible: v };
                  update('totals_grid', { ...(tpl.totals_grid!), columns: cols });
                }}
                label=""
              />
              <span style={{ flex: 1 }}>{col.label}</span>
            </div>
          ))}
        </>
      )}</>
  );
}
