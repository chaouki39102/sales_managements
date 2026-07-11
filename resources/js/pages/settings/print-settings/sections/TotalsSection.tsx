import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { ColorField } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';
import { RowManager } from '../components/RowManager';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('totals_font_size') && <SliderField label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px"
        onChange={v => update('totals_font_size', v)} />}
      {sec('totals_bold') && <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />}
      {sec('totals_align') && <AlignButtons label="محاذاة الإجماليات" value={tpl.totals_align}
        onChange={v => update('totals_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_total_ht') && <Toggle value={tpl.show_total_ht} onChange={v => update('show_total_ht', v)} label="المجموع HT" />}
      {sec('show_total_tva') && <Toggle value={tpl.show_total_tva} onChange={v => update('show_total_tva', v)} label="مبلغ TVA" />}
      {sec('show_tva_breakdown') && <Toggle value={tpl.show_tva_breakdown} onChange={v => update('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />}
      {sec('show_discount_total') && <Toggle value={tpl.show_discount_total} onChange={v => update('show_discount_total', v)} label="إجمالي الخصومات" />}
      {sec('show_fiscal_stamp') && <Toggle value={tpl.show_fiscal_stamp} onChange={v => update('show_fiscal_stamp', v)} label="الطابع الجبائي" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      {sec('show_total_ttc') && <Toggle value={tpl.show_total_ttc} onChange={v => update('show_total_ttc', v)} label="المجموع TTC (الإجمالي)" />}
      {sec('show_total_ttc') && tpl.show_total_ttc && (
        <>
          {sec('total_ttc_font_size') && <SliderField label="حجم خط TTC" value={tpl.total_ttc_font_size} min={12} max={24} unit="px"
            onChange={v => update('total_ttc_font_size', v)} />}
          {sec('total_ttc_bold') && <Toggle value={tpl.total_ttc_bold} onChange={v => update('total_ttc_bold', v)} label="خط عريض" />}
          {sec('total_ttc_color') && <ColorField label="لون TTC" value={tpl.total_ttc_color} onChange={v => update('total_ttc_color', v)} />}
          {sec('total_border_style') && <BorderSelect label="إطار TTC" value={tpl.total_border_style}
            onChange={v => update('total_border_style', v as BorderStyle)} />}
        </>
      )}

      {sec('show_amount_in_words') && <Toggle value={tpl.show_amount_in_words} onChange={v => update('show_amount_in_words', v)} label="المبلغ بالكتابة" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      {sec('show_paid_amount') && <Toggle value={tpl.show_paid_amount} onChange={v => update('show_paid_amount', v)} label="المبلغ المدفوع" />}
      {sec('show_change') && <Toggle value={tpl.show_change} onChange={v => update('show_change', v)} label="الباقي (الصرف)" />}
      {sec('show_remaining') && <Toggle value={tpl.show_remaining} onChange={v => update('show_remaining', v)} label="المبلغ المتبقي" />}
      {sec('show_prev_balance') && <Toggle value={tpl.show_prev_balance} onChange={v => update('show_prev_balance', v)} label="الرصيد السابق" />}
      {sec('show_new_balance') && <Toggle value={tpl.show_new_balance} onChange={v => update('show_new_balance', v)} label="الرصيد الجديد" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>ترتيب الصفوف</div>
      <RowManager
        rows={tpl.totals_rows ?? []}
        onChange={rows => update('totals_rows', rows)}
      /></>
  );
}
